package services

import (
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"strconv"
	"strings"
	"time"
)

// SMTPClient is a small Gmail-compatible SMTP sender used for email OTP.
//
// It speaks STARTTLS on the standard submission port (587) using PLAIN auth
// (Gmail App Passwords work). For implicit TLS (port 465) set tlsImplicit=true.
//
// Plaintext password is never logged. The "From" header can be set to a
// different mailbox (e.g. no-reply@securepharma.co.in); deliverability of that
// envelope depends on Gmail "Send mail as" / SPF being configured for that
// domain, otherwise the recipient may see the auth user as the actual sender.
type SMTPClient struct {
	host        string
	port        int
	username    string
	password    string
	from        string // header From: e.g. "Secure Networker <no-reply@securepharma.co.in>"
	tlsImplicit bool   // true => TLS on connect (465); false => STARTTLS on 587
	dialTimeout time.Duration
	rwTimeout   time.Duration
}

func NewSMTPClient(host string, port int, username, password, fromHeader string, tlsImplicit bool) *SMTPClient {
	return &SMTPClient{
		host:        strings.TrimSpace(host),
		port:        port,
		username:    strings.TrimSpace(username),
		password:    password,
		from:        strings.TrimSpace(fromHeader),
		tlsImplicit: tlsImplicit,
		dialTimeout: 10 * time.Second,
		rwTimeout:   25 * time.Second,
	}
}

// Configured returns true when host + auth + a sender address are present.
func (c *SMTPClient) Configured() bool {
	if c == nil {
		return false
	}
	if c.host == "" || c.port <= 0 || c.username == "" || c.password == "" {
		return false
	}
	if _, addr, err := splitFromHeader(c.from); err != nil || addr == "" {
		return false
	}
	return true
}

// Send delivers a plaintext + minimal HTML email to a single recipient.
// Returns nil on accepted-by-server. Caller must avoid logging the body
// when it contains an OTP code.
func (c *SMTPClient) Send(toEmail, subject, textBody, htmlBody string) error {
	if !c.Configured() {
		return errors.New("smtp client not configured")
	}
	to := strings.TrimSpace(toEmail)
	if to == "" {
		return errors.New("smtp: empty recipient")
	}
	envelopeFrom, fromHeader, err := splitFromHeader(c.from)
	if err != nil {
		return fmt.Errorf("smtp: invalid SMTP_FROM: %w", err)
	}

	msg := buildMIMEMessage(fromHeader, to, subject, textBody, htmlBody)

	addr := net.JoinHostPort(c.host, strconv.Itoa(c.port))
	auth := smtp.PlainAuth("", c.username, c.password, c.host)

	dialer := &net.Dialer{Timeout: c.dialTimeout}

	var client *smtp.Client
	if c.tlsImplicit {
		conn, dErr := tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: c.host, MinVersion: tls.VersionTLS12})
		if dErr != nil {
			return fmt.Errorf("smtp tls dial: %w", dErr)
		}
		_ = conn.SetDeadline(time.Now().Add(c.rwTimeout))
		client, err = smtp.NewClient(conn, c.host)
		if err != nil {
			_ = conn.Close()
			return fmt.Errorf("smtp client: %w", err)
		}
	} else {
		conn, dErr := dialer.Dial("tcp", addr)
		if dErr != nil {
			return fmt.Errorf("smtp dial: %w", dErr)
		}
		_ = conn.SetDeadline(time.Now().Add(c.rwTimeout))
		client, err = smtp.NewClient(conn, c.host)
		if err != nil {
			_ = conn.Close()
			return fmt.Errorf("smtp client: %w", err)
		}
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(&tls.Config{ServerName: c.host, MinVersion: tls.VersionTLS12}); err != nil {
				_ = client.Close()
				return fmt.Errorf("smtp starttls: %w", err)
			}
		}
	}
	defer func() { _ = client.Quit() }()

	if ok, _ := client.Extension("AUTH"); ok {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	if err := client.Mail(envelopeFrom); err != nil {
		return fmt.Errorf("smtp MAIL FROM: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp RCPT TO: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp DATA: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		_ = w.Close()
		return fmt.Errorf("smtp write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp close data: %w", err)
	}
	return nil
}

// splitFromHeader returns (envelopeAddress, fullHeaderValue) from a header
// like `Secure Networker <no-reply@securepharma.co.in>` or `no-reply@securepharma.co.in`.
func splitFromHeader(raw string) (envelope, header string, err error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", "", errors.New("empty from")
	}
	addr, err := mail.ParseAddress(raw)
	if err != nil {
		return "", "", err
	}
	envelope = strings.TrimSpace(addr.Address)
	if addr.Name != "" {
		header = (&mail.Address{Name: addr.Name, Address: addr.Address}).String()
	} else {
		header = addr.Address
	}
	return envelope, header, nil
}

func buildMIMEMessage(fromHeader, to, subject, textBody, htmlBody string) []byte {
	subj := strings.TrimSpace(subject)
	if subj == "" {
		subj = "(no subject)"
	}
	var b strings.Builder
	b.WriteString("From: " + fromHeader + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + mimeEncodeWord(subj) + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Date: " + time.Now().UTC().Format(time.RFC1123Z) + "\r\n")

	if strings.TrimSpace(htmlBody) == "" {
		b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		b.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
		b.WriteString(textBody)
		return []byte(b.String())
	}

	boundary := "fmcgbinary-" + strconv.FormatInt(time.Now().UnixNano(), 36)
	b.WriteString("Content-Type: multipart/alternative; boundary=\"" + boundary + "\"\r\n\r\n")
	b.WriteString("--" + boundary + "\r\n")
	b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	b.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
	b.WriteString(textBody)
	b.WriteString("\r\n--" + boundary + "\r\n")
	b.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	b.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
	b.WriteString(htmlBody)
	b.WriteString("\r\n--" + boundary + "--\r\n")
	return []byte(b.String())
}

// mimeEncodeWord encodes a Subject only when it has non-ASCII chars.
func mimeEncodeWord(s string) string {
	for _, r := range s {
		if r > 127 {
			return "=?UTF-8?B?" + base64Encode([]byte(s)) + "?="
		}
	}
	return s
}

// base64Encode is split out so we don't import encoding/base64 in the helper hot path.
func base64Encode(b []byte) string {
	return stdEncode(b)
}
