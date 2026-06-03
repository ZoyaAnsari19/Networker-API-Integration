package repository

import (
	"context"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PayoutRepo struct{ db *pgxpool.Pool }

func NewPayoutRepo(db *pgxpool.Pool) *PayoutRepo { return &PayoutRepo{db: db} }

func (r *PayoutRepo) Create(ctx context.Context, p *models.PayoutRequest) error {
	return r.db.QueryRow(ctx, `
		INSERT INTO payout_requests (
			user_id, wallet_type, requested_amount,
			service_charge_paise, tds_paise, net_payout_paise, payment_method,
			sc_user_email)
		VALUES ($1, $2::wallet_type, $3, $4, $5, $6, $7, $8)
		RETURNING payout_id, requested_at`,
		p.UserID, p.WalletType, p.RequestedAmount,
		p.ServiceChargePaise, p.TDSPaise, p.NetPayoutPaise, p.PaymentMethod,
		p.SCUserEmail,
	).Scan(&p.PayoutID, &p.RequestedAt)
}

func (r *PayoutRepo) GetByID(ctx context.Context, id string) (*models.PayoutRequest, error) {
	p := &models.PayoutRequest{}
	err := r.db.QueryRow(ctx, `
		SELECT payout_id, user_id, wallet_type, requested_amount,
		       service_charge_paise, tds_paise, net_payout_paise, payment_method,
		       approved_amount,
		       status, admin_id, admin_note, sc_tx_reference, sc_user_email,
		       requested_at, processed_at
		FROM payout_requests WHERE payout_id = $1`, id,
	).Scan(&p.PayoutID, &p.UserID, &p.WalletType, &p.RequestedAmount,
		&p.ServiceChargePaise, &p.TDSPaise, &p.NetPayoutPaise, &p.PaymentMethod,
		&p.ApprovedAmount,
		&p.Status, &p.AdminID, &p.AdminNote, &p.SCTxReference, &p.SCUserEmail,
		&p.RequestedAt, &p.ProcessedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *PayoutRepo) UpdateStatus(ctx context.Context, id, status string, adminID *string, note *string, approvedAmt *int64, scRef *string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE payout_requests
		SET status = $2::payout_status,
		    admin_id = COALESCE($3, admin_id),
		    admin_note = COALESCE($4, admin_note),
		    approved_amount = COALESCE($5, approved_amount),
		    sc_tx_reference = COALESCE($6, sc_tx_reference),
		    processed_at = NOW()
		WHERE payout_id = $1`, id, status, adminID, note, approvedAmt, scRef)
	return err
}

func (r *PayoutRepo) ListByUser(ctx context.Context, userID string, page, limit int) ([]*models.PayoutRequest, int64, error) {
	var total int64
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM payout_requests WHERE user_id=$1`, userID).Scan(&total)

	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT payout_id, user_id, wallet_type, requested_amount,
		       service_charge_paise, tds_paise, net_payout_paise, payment_method,
		       approved_amount,
		       status, admin_id, admin_note, sc_tx_reference, sc_user_email,
		       requested_at, processed_at
		FROM payout_requests WHERE user_id = $1
		ORDER BY requested_at DESC LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var payouts []*models.PayoutRequest
	for rows.Next() {
		p := &models.PayoutRequest{}
		if err := rows.Scan(&p.PayoutID, &p.UserID, &p.WalletType, &p.RequestedAmount,
			&p.ServiceChargePaise, &p.TDSPaise, &p.NetPayoutPaise, &p.PaymentMethod,
			&p.ApprovedAmount,
			&p.Status, &p.AdminID, &p.AdminNote, &p.SCTxReference, &p.SCUserEmail,
			&p.RequestedAt, &p.ProcessedAt); err != nil {
			return nil, 0, err
		}
		payouts = append(payouts, p)
	}
	return payouts, total, nil
}

func (r *PayoutRepo) ListByStatus(ctx context.Context, status string, page, limit int) ([]*models.PayoutRequest, int64, error) {
	var total int64
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM payout_requests WHERE ($1='' OR status=$1::payout_status)`, status).Scan(&total)

	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT payout_id, user_id, wallet_type, requested_amount,
		       service_charge_paise, tds_paise, net_payout_paise, payment_method,
		       approved_amount,
		       status, admin_id, admin_note, sc_tx_reference, sc_user_email,
		       requested_at, processed_at
		FROM payout_requests
		WHERE ($1='' OR status=$1::payout_status)
		ORDER BY requested_at DESC LIMIT $2 OFFSET $3`, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var payouts []*models.PayoutRequest
	for rows.Next() {
		p := &models.PayoutRequest{}
		if err := rows.Scan(&p.PayoutID, &p.UserID, &p.WalletType, &p.RequestedAmount,
			&p.ServiceChargePaise, &p.TDSPaise, &p.NetPayoutPaise, &p.PaymentMethod,
			&p.ApprovedAmount,
			&p.Status, &p.AdminID, &p.AdminNote, &p.SCTxReference, &p.SCUserEmail,
			&p.RequestedAt, &p.ProcessedAt); err != nil {
			return nil, 0, err
		}
		payouts = append(payouts, p)
	}
	return payouts, total, nil
}

// HasOpenPendingPayout is true when the user already has a payout stuck in PENDING
// (they must wait for admin action before opening another request).
func (r *PayoutRepo) HasOpenPendingPayout(ctx context.Context, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM payout_requests
			WHERE user_id=$1 AND status = 'PENDING'
		)`, userID).Scan(&exists)
	return exists, err
}
