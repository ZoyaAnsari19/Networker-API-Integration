package repository

import (
	"context"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type P2PRepo struct{ db *pgxpool.Pool }

func NewP2PRepo(db *pgxpool.Pool) *P2PRepo { return &P2PRepo{db: db} }

// InsertTx records a completed P2P transfer inside an ongoing pg transaction.
// The caller (P2PService) already owns the tx that debited the sender and
// credited the receiver; recording the p2p_transfers row in the same tx keeps
// the three writes atomic so partial failures cannot leak money.
func (r *P2PRepo) InsertTx(ctx context.Context, tx pgx.Tx, t *models.P2PTransfer) error {
	return tx.QueryRow(ctx, `
		INSERT INTO p2p_transfers (
			sender_user_id, receiver_user_id,
			sender_sponsor_id, receiver_sponsor_id,
			wallet_type, amount, service_charge, net_amount,
			note, debit_ledger_id, credit_ledger_id
		) VALUES ($1,$2,$3,$4,$5::wallet_type,$6,$7,$8,$9,$10,$11)
		RETURNING transfer_id, created_at`,
		t.SenderUserID, t.ReceiverUserID,
		t.SenderSponsorID, t.ReceiverSponsorID,
		t.WalletType, t.Amount, t.ServiceCharge, t.NetAmount,
		nullableStr(t.Note), t.DebitLedgerID, t.CreditLedgerID,
	).Scan(&t.TransferID, &t.CreatedAt)
}

// ListForUser returns every transfer the user was involved in (sender OR
// receiver), annotated with direction + counterparty name so the UI can
// render a single unified history list.
func (r *P2PRepo) ListForUser(ctx context.Context, userID string, page, limit int) ([]*models.P2PTransfer, int64, error) {
	var total int64
	_ = r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM p2p_transfers
		WHERE sender_user_id = $1 OR receiver_user_id = $1`, userID).Scan(&total)

	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT t.transfer_id, t.sender_user_id, t.receiver_user_id,
		       t.sender_sponsor_id, t.receiver_sponsor_id,
		       t.wallet_type, t.amount, t.service_charge, t.net_amount,
		       t.note, t.debit_ledger_id, t.credit_ledger_id, t.created_at,
		       CASE WHEN t.sender_user_id = $1 THEN 'OUT' ELSE 'IN' END AS direction,
		       CASE WHEN t.sender_user_id = $1 THEN r.full_name ELSE s.full_name END AS counterparty_name
		FROM p2p_transfers t
		JOIN networker_users s ON s.user_id = t.sender_user_id
		JOIN networker_users r ON r.user_id = t.receiver_user_id
		WHERE t.sender_user_id = $1 OR t.receiver_user_id = $1
		ORDER BY t.created_at DESC
		LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []*models.P2PTransfer
	for rows.Next() {
		t := &models.P2PTransfer{}
		var note *string
		if err := rows.Scan(
			&t.TransferID, &t.SenderUserID, &t.ReceiverUserID,
			&t.SenderSponsorID, &t.ReceiverSponsorID,
			&t.WalletType, &t.Amount, &t.ServiceCharge, &t.NetAmount,
			&note, &t.DebitLedgerID, &t.CreditLedgerID, &t.CreatedAt,
			&t.Direction, &t.CounterpartyName,
		); err != nil {
			return nil, 0, err
		}
		t.Note = note
		out = append(out, t)
	}
	return out, total, nil
}

func nullableStr(s *string) any {
	if s == nil || *s == "" {
		return nil
	}
	return *s
}
