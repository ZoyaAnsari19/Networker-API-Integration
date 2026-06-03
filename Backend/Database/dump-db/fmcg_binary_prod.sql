--
-- PostgreSQL database dump
--

\restrict MpUrs4ia35XD8e8KUHi6KTKEUcORQcZC0mZYMQPGBu7MPYo9KnNq5z6DcRC8ugN

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: api_key_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.api_key_status AS ENUM (
    'ACTIVE',
    'DISABLED'
);


--
-- Name: bv_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bv_status AS ENUM (
    'UNMATCHED',
    'MATCHED'
);


--
-- Name: commission_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.commission_source AS ENUM (
    'DIRECT_COMMISSION',
    'BINARY_MATCH',
    'LEVEL_BONUS',
    'FRANCHISE_COMMISSION',
    'WITHDRAWAL',
    'ADMIN_ADJUSTMENT',
    'P2P_TRANSFER'
);


--
-- Name: entry_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.entry_type AS ENUM (
    'CREDIT',
    'DEBIT'
);


--
-- Name: flush_period; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.flush_period AS ENUM (
    'never',
    'weekly',
    'monthly'
);


--
-- Name: held_income_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.held_income_status AS ENUM (
    'HELD',
    'RELEASED',
    'FORFEITED'
);


--
-- Name: kyc_document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kyc_document_type AS ENUM (
    'PAN_CARD',
    'AADHAAR_CARD',
    'AADHAAR_FRONT',
    'AADHAAR_BACK',
    'BANK_PASSBOOK',
    'OTHER'
);


--
-- Name: kyc_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kyc_status AS ENUM (
    'PENDING',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);


--
-- Name: package_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.package_status AS ENUM (
    'ACTIVE',
    'DISABLED'
);


--
-- Name: payout_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payout_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


--
-- Name: placement_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.placement_request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'AUTO_PLACED',
    'ADMIN_PLACED'
);


--
-- Name: placement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.placement_status AS ENUM (
    'PLACED',
    'PENDING_PLACEMENT'
);


--
-- Name: reference_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reference_type AS ENUM (
    'PURCHASE',
    'PAYOUT',
    'ADMIN',
    'PACKAGE_ACTIVATION',
    'P2P'
);


--
-- Name: support_sender_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_sender_type AS ENUM (
    'user',
    'admin',
    'system'
);


--
-- Name: support_ticket_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.support_ticket_status AS ENUM (
    'open',
    'in_progress',
    'closed'
);


--
-- Name: tree_leg; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tree_leg AS ENUM (
    'LEFT',
    'RIGHT'
);


--
-- Name: user_package_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_package_status AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'RENEWED'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'NETWORKER',
    'ADMIN',
    'SUB_ADMIN'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'BLOCKED'
);


--
-- Name: wallet_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_type AS ENUM (
    'DIRECT',
    'TEAM'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_staff_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_staff_permissions (
    user_id uuid NOT NULL,
    permission_key character varying(64) NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    granted_by uuid
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id character varying(255) NOT NULL,
    details jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_agent text
);


--
-- Name: binary_tree; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.binary_tree (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    parent_id uuid,
    leg public.tree_leg,
    left_child_id uuid,
    right_child_id uuid,
    left_bv bigint DEFAULT 0 NOT NULL,
    right_bv bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    lifetime_left_bv bigint DEFAULT 0 NOT NULL,
    lifetime_right_bv bigint DEFAULT 0 NOT NULL
);


--
-- Name: binary_tree_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.binary_tree_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: binary_tree_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.binary_tree_id_seq OWNED BY public.binary_tree.id;


--
-- Name: bv_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bv_ledger (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    source_user_id uuid NOT NULL,
    leg public.tree_leg NOT NULL,
    bv_amount bigint NOT NULL,
    order_reference character varying(255),
    status public.bv_status DEFAULT 'UNMATCHED'::public.bv_status NOT NULL,
    matched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bv_ledger_bv_amount_check CHECK ((bv_amount > 0))
);


--
-- Name: bv_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bv_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bv_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bv_ledger_id_seq OWNED BY public.bv_ledger.id;


--
-- Name: commission_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_config (
    id integer NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: commission_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commission_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commission_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commission_config_id_seq OWNED BY public.commission_config.id;


--
-- Name: daily_pair_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_pair_stats (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    stat_date date DEFAULT CURRENT_DATE NOT NULL,
    pairs_today integer DEFAULT 0 NOT NULL,
    total_pairs_lifetime integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_pair_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_pair_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_pair_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_pair_stats_id_seq OWNED BY public.daily_pair_stats.id;


--
-- Name: dashboard_home_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_home_content (
    id smallint DEFAULT 1 NOT NULL,
    slider_slides jsonb DEFAULT '[]'::jsonb NOT NULL,
    notices jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dashboard_home_content_id_check CHECK ((id = 1))
);


--
-- Name: fmcg_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fmcg_api_keys (
    id integer NOT NULL,
    app_name character varying(100) NOT NULL,
    api_key character varying(255) NOT NULL,
    api_secret character varying(255) NOT NULL,
    status public.api_key_status DEFAULT 'ACTIVE'::public.api_key_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fmcg_api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fmcg_api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fmcg_api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fmcg_api_keys_id_seq OWNED BY public.fmcg_api_keys.id;


--
-- Name: held_income; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.held_income (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    wallet_type public.wallet_type NOT NULL,
    source public.commission_source NOT NULL,
    amount bigint NOT NULL,
    reference_id character varying(255),
    reference_type public.reference_type,
    description text,
    period_ym integer NOT NULL,
    status public.held_income_status DEFAULT 'HELD'::public.held_income_status NOT NULL,
    released_ledger_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT held_income_amount_check CHECK ((amount > 0))
);


--
-- Name: held_income_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.held_income_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: held_income_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.held_income_id_seq OWNED BY public.held_income.id;


--
-- Name: kyc_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_documents (
    document_id uuid DEFAULT gen_random_uuid() NOT NULL,
    kyc_id uuid NOT NULL,
    document_type public.kyc_document_type NOT NULL,
    document_url text NOT NULL,
    file_name character varying(500),
    file_size bigint,
    mime_type character varying(100),
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kyc_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_requests (
    kyc_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status public.kyc_status DEFAULT 'PENDING'::public.kyc_status NOT NULL,
    rejection_reason text,
    admin_id uuid,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: level_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.level_achievements (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    level_number integer NOT NULL,
    total_bv_at_achievement bigint DEFAULT 0 NOT NULL,
    achieved_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: level_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.level_achievements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: level_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.level_achievements_id_seq OWNED BY public.level_achievements.id;


--
-- Name: level_bonus_slabs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.level_bonus_slabs (
    id integer NOT NULL,
    bonus_percent numeric(5,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    level_number integer NOT NULL,
    min_total_bv_paise bigint DEFAULT 0 NOT NULL,
    CONSTRAINT level_bonus_slabs_level_nonneg CHECK ((level_number >= 0))
);


--
-- Name: level_bonus_slabs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.level_bonus_slabs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: level_bonus_slabs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.level_bonus_slabs_id_seq OWNED BY public.level_bonus_slabs.id;


--
-- Name: sponsor_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sponsor_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: networker_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.networker_users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id character varying(8) DEFAULT ('SPF'::text || lpad((nextval('public.sponsor_code_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    sponsor_user_id uuid,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    password_hash character varying(255) NOT NULL,
    status public.user_status DEFAULT 'ACTIVE'::public.user_status NOT NULL,
    role public.user_role DEFAULT 'NETWORKER'::public.user_role NOT NULL,
    current_package_id uuid,
    package_activated_at timestamp with time zone,
    today_binary_earned bigint DEFAULT 0 NOT NULL,
    daily_binary_cap bigint DEFAULT 0 NOT NULL,
    placement_status public.placement_status DEFAULT 'PLACED'::public.placement_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_object_key text,
    payout_upi_id character varying(100),
    payout_bank_display character varying(200),
    secure_wallet_external_id character varying(128),
    secure_wallet_balance_paise bigint,
    transaction_password_hash character varying(255),
    monthly_income_paise bigint DEFAULT 0 NOT NULL,
    monthly_shopping_paise bigint DEFAULT 0 NOT NULL,
    income_period_ym integer DEFAULT (((EXTRACT(year FROM now()))::integer * 100) + (EXTRACT(month FROM now()))::integer) NOT NULL,
    current_level integer DEFAULT 0 NOT NULL,
    sc_wallet_code character varying(128),
    sc_linked_at timestamp with time zone,
    staff_created_by uuid,
    staff_last_login_at timestamp with time zone,
    staff_action_pin_hash text,
    admin_title text,
    admin_title_image_object_key text
);


--
-- Name: p2p_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.p2p_transfers (
    transfer_id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_user_id uuid NOT NULL,
    receiver_user_id uuid NOT NULL,
    sender_sponsor_id character varying(32) NOT NULL,
    receiver_sponsor_id character varying(32) NOT NULL,
    wallet_type public.wallet_type DEFAULT 'DIRECT'::public.wallet_type NOT NULL,
    amount bigint NOT NULL,
    service_charge bigint DEFAULT 0 NOT NULL,
    net_amount bigint NOT NULL,
    note text,
    debit_ledger_id bigint,
    credit_ledger_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT p2p_transfers_amount_check CHECK ((amount > 0)),
    CONSTRAINT p2p_transfers_check CHECK ((sender_user_id <> receiver_user_id)),
    CONSTRAINT p2p_transfers_check1 CHECK (((net_amount + service_charge) = amount)),
    CONSTRAINT p2p_transfers_net_amount_check CHECK ((net_amount > 0)),
    CONSTRAINT p2p_transfers_service_charge_check CHECK ((service_charge >= 0))
);


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    package_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    amount bigint NOT NULL,
    daily_binary_cap bigint DEFAULT 0 NOT NULL,
    status public.package_status DEFAULT 'ACTIVE'::public.package_status NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT packages_amount_check CHECK ((amount > 0))
);


--
-- Name: pair_match_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pair_match_log (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    left_bv_matched bigint DEFAULT 0 NOT NULL,
    right_bv_matched bigint DEFAULT 0 NOT NULL,
    matched_bv bigint DEFAULT 0 NOT NULL,
    carry_forward_bv bigint DEFAULT 0 NOT NULL,
    carry_forward_leg public.tree_leg,
    commission_amount bigint DEFAULT 0 NOT NULL,
    level_bonus_amount bigint DEFAULT 0 NOT NULL,
    total_credited bigint DEFAULT 0 NOT NULL,
    cap_deducted bigint DEFAULT 0 NOT NULL,
    order_reference character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pair_match_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pair_match_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pair_match_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pair_match_log_id_seq OWNED BY public.pair_match_log.id;


--
-- Name: path_rank_slabs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.path_rank_slabs (
    rank_level integer NOT NULL,
    name character varying(50) NOT NULL,
    min_direct_bv_paise bigint DEFAULT 0 NOT NULL,
    min_lifetime_pairs integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT path_rank_slabs_min_direct_bv_paise_check CHECK ((min_direct_bv_paise >= 0)),
    CONSTRAINT path_rank_slabs_min_lifetime_pairs_check CHECK ((min_lifetime_pairs >= 0)),
    CONSTRAINT path_rank_slabs_rank_level_check CHECK ((rank_level >= 1))
);


--
-- Name: payout_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payout_config (
    id integer NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payout_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payout_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payout_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payout_config_id_seq OWNED BY public.payout_config.id;


--
-- Name: payout_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payout_requests (
    payout_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wallet_type public.wallet_type NOT NULL,
    requested_amount bigint NOT NULL,
    service_charge_paise bigint DEFAULT 0 NOT NULL,
    tds_paise bigint DEFAULT 0 NOT NULL,
    net_payout_paise bigint DEFAULT 0 NOT NULL,
    payment_method character varying(20) DEFAULT 'SECURE_WALLET'::character varying NOT NULL,
    approved_amount bigint,
    status public.payout_status DEFAULT 'PENDING'::public.payout_status NOT NULL,
    admin_id uuid,
    admin_note text,
    sc_tx_reference character varying(255),
    sc_user_email character varying(255),
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT chk_payout_fees_lte_gross CHECK (((service_charge_paise + tds_paise) <= requested_amount)),
    CONSTRAINT chk_payout_net_nonneg CHECK ((net_payout_paise >= 0)),
    CONSTRAINT payout_requests_requested_amount_check CHECK ((requested_amount > 0))
);


--
-- Name: pending_bv_hold; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_bv_hold (
    id bigint NOT NULL,
    source_user_id uuid NOT NULL,
    order_reference character varying(128) NOT NULL,
    bv_amount bigint NOT NULL,
    status character varying(16) DEFAULT 'HELD'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone
);


--
-- Name: pending_bv_hold_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pending_bv_hold_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pending_bv_hold_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pending_bv_hold_id_seq OWNED BY public.pending_bv_hold.id;


--
-- Name: placement_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sponsor_user_id uuid NOT NULL,
    status public.placement_request_status DEFAULT 'PENDING'::public.placement_request_status NOT NULL,
    decided_leg public.tree_leg,
    decided_by uuid,
    expires_at timestamp with time zone NOT NULL,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_pre_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_pre_questions (
    id integer NOT NULL,
    question character varying(200) NOT NULL,
    category character varying(80),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_pre_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_pre_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_pre_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_pre_questions_id_seq OWNED BY public.support_pre_questions.id;


--
-- Name: support_ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_messages (
    id bigint NOT NULL,
    ticket_id uuid NOT NULL,
    sender_type public.support_sender_type NOT NULL,
    sender_user_id uuid,
    message_text text,
    attachment_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_ticket_messages_check CHECK ((((message_text IS NOT NULL) AND (length(btrim(message_text)) > 0)) OR (jsonb_array_length(attachment_urls) > 0)))
);


--
-- Name: support_ticket_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_ticket_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_ticket_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_ticket_messages_id_seq OWNED BY public.support_ticket_messages.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pre_question_id integer,
    subject character varying(200),
    status public.support_ticket_status DEFAULT 'open'::public.support_ticket_status NOT NULL,
    assigned_to uuid,
    closed_at timestamp with time zone,
    closed_by_user_id uuid,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_packages (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    package_id uuid NOT NULL,
    amount_paid bigint NOT NULL,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    expired_at timestamp with time zone,
    status public.user_package_status DEFAULT 'ACTIVE'::public.user_package_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_packages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_packages_id_seq OWNED BY public.user_packages.id;


--
-- Name: wallet_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_ledger (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    wallet_type public.wallet_type NOT NULL,
    amount bigint NOT NULL,
    entry_type public.entry_type NOT NULL,
    source public.commission_source NOT NULL,
    reference_id character varying(255),
    reference_type public.reference_type,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_ledger_amount_check CHECK ((amount > 0))
);


--
-- Name: wallet_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallet_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_ledger_id_seq OWNED BY public.wallet_ledger.id;


--
-- Name: binary_tree id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binary_tree ALTER COLUMN id SET DEFAULT nextval('public.binary_tree_id_seq'::regclass);


--
-- Name: bv_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bv_ledger ALTER COLUMN id SET DEFAULT nextval('public.bv_ledger_id_seq'::regclass);


--
-- Name: commission_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_config ALTER COLUMN id SET DEFAULT nextval('public.commission_config_id_seq'::regclass);


--
-- Name: daily_pair_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pair_stats ALTER COLUMN id SET DEFAULT nextval('public.daily_pair_stats_id_seq'::regclass);


--
-- Name: fmcg_api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fmcg_api_keys ALTER COLUMN id SET DEFAULT nextval('public.fmcg_api_keys_id_seq'::regclass);


--
-- Name: held_income id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.held_income ALTER COLUMN id SET DEFAULT nextval('public.held_income_id_seq'::regclass);


--
-- Name: level_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.level_achievements ALTER COLUMN id SET DEFAULT nextval('public.level_achievements_id_seq'::regclass);


--
-- Name: level_bonus_slabs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.level_bonus_slabs ALTER COLUMN id SET DEFAULT nextval('public.level_bonus_slabs_id_seq'::regclass);


--
-- Name: pair_match_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pair_match_log ALTER COLUMN id SET DEFAULT nextval('public.pair_match_log_id_seq'::regclass);


--
-- Name: payout_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_config ALTER COLUMN id SET DEFAULT nextval('public.payout_config_id_seq'::regclass);


--
-- Name: pending_bv_hold id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_bv_hold ALTER COLUMN id SET DEFAULT nextval('public.pending_bv_hold_id_seq'::regclass);


--
-- Name: support_pre_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_pre_questions ALTER COLUMN id SET DEFAULT nextval('public.support_pre_questions_id_seq'::regclass);


--
-- Name: support_ticket_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages ALTER COLUMN id SET DEFAULT nextval('public.support_ticket_messages_id_seq'::regclass);


--
-- Name: user_packages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_packages ALTER COLUMN id SET DEFAULT nextval('public.user_packages_id_seq'::regclass);


--
-- Name: wallet_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_ledger ALTER COLUMN id SET DEFAULT nextval('public.wallet_ledger_id_seq'::regclass);


--
-- Data for Name: admin_staff_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_staff_permissions (user_id, permission_key, granted_at, granted_by) FROM stdin;
2fe361c7-90ac-4586-b007-fdffdd77a9b8	networker.manage	2026-05-20 11:26:09.016909+00	00000000-0000-0000-0000-000000000001
2fe361c7-90ac-4586-b007-fdffdd77a9b8	networker.view	2026-05-20 11:26:09.016909+00	00000000-0000-0000-0000-000000000001
2fe361c7-90ac-4586-b007-fdffdd77a9b8	support.manage	2026-05-20 11:26:09.016909+00	00000000-0000-0000-0000-000000000001
2fe361c7-90ac-4586-b007-fdffdd77a9b8	support.view	2026-05-20 11:26:09.016909+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	income_binary.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	income_direct.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	kyc.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	kyc.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	ledger.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	networker.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	networker.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	notifications.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	notifications.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	packages.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	packages.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	placement.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	placement.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	platform_config.commission_placement.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	platform_config.level_bonus.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	platform_config.p2p.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	platform_config.withdrawals.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	support.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	withdraw.manage	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	withdraw.view	2026-05-20 11:45:18.929596+00	00000000-0000-0000-0000-000000000001
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (log_id, actor_id, action, target_type, target_id, details, ip_address, created_at, user_agent) FROM stdin;
17cf4bef-7123-4b97-9a6c-a8341acf3725	00000000-0000-0000-0000-000000000001	STAFF_CREATE	STAFF	cae989db-1be4-4c04-b43f-0f9a9d23aca3	{"email": "faizan@gmail.com", "status": "ACTIVE", "permissions": ["dashboard.read", "users.read", "users.write", "users.wallet", "placement.read", "placement.write", "kyc.read", "kyc.write", "payouts.read", "payouts.approve", "reports.ledger", "reports.income_direct", "reports.income_binary", "config.packages", "config.notifications", "config.platform"]}	127.0.0.1	2026-05-18 08:57:01.553892+00	\N
3a5a23c9-e917-44e3-b834-b6d27b322f97	00000000-0000-0000-0000-000000000001	STAFF_CREATE	STAFF	4804ecb8-2732-4e9c-b602-83518a025a3b	{"email": "zishan@gmail.com", "status": "ACTIVE", "permissions": ["dashboard.read", "users.read"]}	127.0.0.1	2026-05-18 09:26:39.313708+00	\N
b7f3853d-bde6-4cd7-a445-6f6547942654	00000000-0000-0000-0000-000000000001	STAFF_CREATE	STAFF	50c3011a-0d43-4f59-8fe9-8546a09fb14e	{"email": "moin@gmail.com", "status": "ACTIVE", "permissions": ["users.read", "reports.ledger", "reports.income_direct", "reports.income_binary"]}	127.0.0.1	2026-05-18 09:58:06.559688+00	\N
f14105a8-24ca-464a-9fc3-03baacebb5f1	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	50c3011a-0d43-4f59-8fe9-8546a09fb14e	{"permissions": ["reports.income_binary", "reports.income_direct", "reports.ledger", "users.read", "config.packages", "config.platform"]}	127.0.0.1	2026-05-18 10:01:57.898432+00	\N
1785c65a-5bf4-4469-9667-1b42764ad5a1	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	50c3011a-0d43-4f59-8fe9-8546a09fb14e	{"permissions": ["config.packages", "config.platform", "reports.income_binary", "reports.income_direct", "reports.ledger", "users.read"]}	127.0.0.1	2026-05-18 10:31:33.80479+00	\N
5492e91e-d8aa-4691-9772-1efc73ea0105	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	50c3011a-0d43-4f59-8fe9-8546a09fb14e	{"permissions": ["reports.income_binary", "reports.income_direct", "reports.ledger", "users.read"]}	127.0.0.1	2026-05-18 11:07:46.059897+00	\N
12b4a554-f2a9-4cdb-83e8-c7e7d5fc4218	00000000-0000-0000-0000-000000000001	STAFF_DELETE	STAFF	50c3011a-0d43-4f59-8fe9-8546a09fb14e	{"email": "moin@gmail.com", "status": "ACTIVE"}	127.0.0.1	2026-05-18 12:03:10.633324+00	\N
f3368c56-49d4-465a-a673-8052b463ede2	00000000-0000-0000-0000-000000000001	STAFF_DELETE	STAFF	4804ecb8-2732-4e9c-b602-83518a025a3b	{"email": "zishan@gmail.com", "status": "ACTIVE"}	127.0.0.1	2026-05-18 12:03:13.359794+00	\N
f8f6765a-0109-43a3-9765-b4c3b49ae9f8	00000000-0000-0000-0000-000000000001	STAFF_DELETE	STAFF	cae989db-1be4-4c04-b43f-0f9a9d23aca3	{"email": "faizan@gmail.com", "status": "ACTIVE"}	127.0.0.1	2026-05-18 12:03:16.205667+00	\N
f83bebd5-1573-45fc-88ed-25c1eb52779b	00000000-0000-0000-0000-000000000001	STAFF_CREATE	STAFF	dad4ae02-36ef-4a89-85ac-f4c984136a2d	{"email": "zishan@gmail.com", "status": "ACTIVE", "permissions": ["networker.view", "platform_config.view", "notifications.view", "packages.view", "income_binary.view", "income_direct.view", "ledger.view", "withdraw.view", "kyc.view"]}	127.0.0.1	2026-05-18 12:04:51.012988+00	\N
c5ed922c-c7b3-493d-8976-412f814cb087	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	dad4ae02-36ef-4a89-85ac-f4c984136a2d	{"permissions": ["income_binary.view", "income_direct.view", "kyc.view", "ledger.view", "networker.view", "notifications.view", "packages.view", "withdraw.view", "platform_config.level_bonus.manage"]}	127.0.0.1	2026-05-18 13:00:01.475081+00	\N
2ecaf135-9b79-4297-8c6f-a87edd92186c	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	dad4ae02-36ef-4a89-85ac-f4c984136a2d	{"permissions": ["income_binary.view", "income_direct.view", "kyc.view", "ledger.view", "networker.view", "packages.view", "platform_config.level_bonus.manage", "withdraw.view"]}	127.0.0.1	2026-05-18 13:10:05.468587+00	\N
f3c9ac97-f6a3-42c6-9388-b73bf8807e87	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	dad4ae02-36ef-4a89-85ac-f4c984136a2d	{"permissions": ["income_binary.view", "income_direct.view", "kyc.view", "ledger.view", "networker.view", "packages.view", "platform_config.level_bonus.manage"]}	127.0.0.1	2026-05-18 13:13:13.720946+00	\N
1f67d707-8a47-481e-bb09-41d59b1461b9	00000000-0000-0000-0000-000000000001	STAFF_DELETE	STAFF	dad4ae02-36ef-4a89-85ac-f4c984136a2d	{"email": "zishan@gmail.com", "status": "ACTIVE"}	127.0.0.1	2026-05-19 06:03:40.600331+00	\N
413f6091-9647-483d-bf2a-cdf8562665a9	00000000-0000-0000-0000-000000000001	STAFF_CREATE	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"email": "junaid@gmail.com", "status": "ACTIVE", "permissions": ["networker.view", "networker.manage", "platform_config.level_bonus.manage", "platform_config.p2p.manage"]}	127.0.0.1	2026-05-19 06:04:35.742359+00	\N
92dbfe11-b349-42ac-9ad8-313ad6e184cd	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"permissions": ["networker.view", "networker.manage", "placement.view", "placement.manage", "kyc.view", "kyc.manage", "withdraw.view", "withdraw.manage", "ledger.view", "income_direct.view", "income_binary.view", "packages.view", "packages.manage", "notifications.view", "notifications.manage", "platform_config.commission_placement.manage", "platform_config.withdrawals.manage", "platform_config.p2p.manage", "platform_config.level_bonus.manage"]}	127.0.0.1	2026-05-19 08:13:06.976708+00	\N
cd269b0f-71bd-4247-9bac-7068c16ed5b7	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	STAFF_PIN_DENIED	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"endpoint": "POST /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5/wallet-adjustment"}	127.0.0.1	2026-05-19 08:14:00.273434+00	\N
47adb04e-1b46-4ac7-a370-8ddfe6cc8bd4	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	STAFF_PIN_DENIED	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 08:14:36.093625+00	\N
0f2394b7-3101-4d18-9592-0b43cf87958a	00000000-0000-0000-0000-000000000001	STAFF_PIN_RESET	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	\N	127.0.0.1	2026-05-19 08:15:17.452385+00	\N
25800bbb-775c-4cdb-a336-64c5e09a55b8	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"permissions": ["income_binary.view", "income_direct.view", "kyc.manage", "kyc.view", "ledger.view", "networker.manage", "networker.view", "notifications.manage", "notifications.view", "packages.manage", "packages.view", "placement.manage", "placement.view", "platform_config.commission_placement.manage", "platform_config.level_bonus.manage", "platform_config.p2p.manage", "platform_config.withdrawals.manage", "withdraw.manage", "withdraw.view"], "action_pin_reset": true}	127.0.0.1	2026-05-19 08:15:17.476336+00	\N
b355a3d4-4ea9-4b83-9249-008d9e5eeff1	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	STAFF_PIN_DENIED	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 08:15:27.660209+00	\N
2f0c5fe8-8f98-4858-98fb-6ec9b4047139	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	STAFF_PIN_LOCKED	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5", "fail_count": 3}	127.0.0.1	2026-05-19 08:15:27.66798+00	\N
08a7b206-12bc-4f4d-aed1-a245e9fe9bf3	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	STAFF_PIN_DENIED	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 08:15:38.076639+00	\N
4d9d51e8-bd63-4af3-bf5c-887ee3014b41	00000000-0000-0000-0000-000000000001	STAFF_STATUS	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"new": "INACTIVE", "old": "ACTIVE"}	127.0.0.1	2026-05-19 08:31:26.650866+00	\N
2b0a346e-bcf1-4ee3-a8ac-517a5c42a847	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"status": "INACTIVE"}	127.0.0.1	2026-05-19 08:31:26.65408+00	\N
f868945b-4403-433c-95cb-97aaf8320f96	00000000-0000-0000-0000-000000000001	STAFF_CREATE	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"email": "zishan@gmail.com", "status": "ACTIVE", "permissions": ["networker.view", "networker.manage"]}	127.0.0.1	2026-05-19 08:32:18.276999+00	\N
20afcaa8-cb4f-4ad6-b66b-e95c8f20ca7e	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 08:32:36.901968+00	\N
e327c001-014d-4690-9e59-37f09d4b7d35	00000000-0000-0000-0000-000000000001	STAFF_PIN_RESET	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	\N	127.0.0.1	2026-05-19 08:45:43.522155+00	\N
d42052fd-194b-4f68-8b6f-84f9aa22dd58	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"permissions": ["networker.manage", "networker.view"], "action_pin_reset": true}	127.0.0.1	2026-05-19 08:45:43.53511+00	\N
89ac1cd5-a13a-4727-b050-5e2e7aee85f5	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 08:47:38.704792+00	\N
5794c70f-7485-4450-9ec0-7dd6c1e3ab5f	00000000-0000-0000-0000-000000000001	STAFF_PIN_RESET	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	\N	127.0.0.1	2026-05-19 08:54:23.32676+00	\N
e357e1a0-72e4-43be-b6fa-5006a4f8c2e7	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"permissions": ["income_binary.view", "income_direct.view", "kyc.manage", "kyc.view", "ledger.view", "networker.manage", "networker.view", "notifications.manage", "notifications.view", "packages.manage", "packages.view", "placement.manage", "placement.view", "platform_config.commission_placement.manage", "platform_config.level_bonus.manage", "platform_config.p2p.manage", "platform_config.withdrawals.manage", "withdraw.manage", "withdraw.view"], "password_reset": true, "action_pin_reset": true}	127.0.0.1	2026-05-19 08:54:23.358128+00	\N
75a5cbc6-96c0-4117-888b-fc81b2e01b3d	00000000-0000-0000-0000-000000000001	STAFF_PIN_RESET	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	\N	127.0.0.1	2026-05-19 08:54:47.824923+00	\N
57fc09b0-3188-41ae-9956-d7042878aab9	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"permissions": ["networker.manage", "networker.view"], "password_reset": true, "action_pin_reset": true}	127.0.0.1	2026-05-19 08:54:47.837139+00	\N
3882534f-3bd7-4e5c-937d-ec0d95d42faa	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 08:55:41.97966+00	\N
e866cbd2-d294-42fd-98e8-6ddc8f14970d	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 08:59:27.149445+00	\N
0bea02fe-1880-4d1f-ad80-24acae241420	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_LOCKED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5", "fail_count": 3}	127.0.0.1	2026-05-19 08:59:27.154216+00	\N
bdda8771-894f-4680-9579-298f578c544e	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 09:00:47.090885+00	\N
9025eca9-7d2e-46b4-86b9-f7b0a520543c	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 09:03:00.955907+00	\N
361f36f2-3c87-4f00-a7ed-03ac0eb63d58	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 09:13:40.739653+00	\N
ff2ac14e-808e-4cc1-aaab-a6f4b0fedf7d	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 09:16:26.749435+00	\N
c8a0af09-285f-45f8-b42d-a2af963a20bd	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 09:45:09.490462+00	\N
212a3dc9-b85d-4ba0-aab7-779bf038d4f3	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/00000000-0000-0000-0000-000000000001"}	127.0.0.1	2026-05-19 09:56:18.457479+00	\N
8fbc525f-7a88-4d2d-bba4-e0401bd10ff5	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/00000000-0000-0000-0000-000000000001"}	127.0.0.1	2026-05-19 09:57:00.390933+00	\N
2fbf39e9-6798-4271-bb6c-9bc963b0b00b	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_LOCKED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/00000000-0000-0000-0000-000000000001", "fail_count": 3}	127.0.0.1	2026-05-19 09:57:00.397862+00	\N
d73c0b59-6f41-4036-a1f0-6740d8ff1b13	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 09:58:24.614861+00	\N
8be67f47-6fe0-437e-91c2-e9f6d8b18ad4	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 09:58:24.633268+00	\N
88e1fcd4-49f1-4208-9df8-be52ac51d3e8	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 09:58:24.64701+00	\N
0c6f1e69-da7f-4132-a613-820d3d60482c	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 09:58:56.767151+00	\N
f53ae7b5-7fcf-4948-98e5-58b2f1a0b1b2	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 10:00:47.410778+00	\N
0a583c58-8b7a-4fbe-9e16-abcd4f8c2900	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 10:00:47.435134+00	\N
8a2e880c-daa8-479a-bd89-9c5bb967bf12	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 10:06:39.133306+00	\N
021c30bf-5680-44fe-9307-86d45389d0b1	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 10:06:39.142802+00	\N
94645a72-432b-4fe9-9ab5-1ad9e4527e5f	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 10:06:53.824215+00	\N
0d702968-de7b-45b8-af1f-b656b4a8e684	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 10:07:29.449263+00	\N
c68ee4cb-74c3-44c5-88f1-30a83c4e8762	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 10:07:29.473872+00	\N
6c61cf82-eea0-4a37-8649-7ff73119a3ed	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 10:07:39.736274+00	\N
cd518fae-1c97-4209-abb0-8f911551fd5c	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/b95015cf-9563-416e-b9a2-1c5391daa923"}	127.0.0.1	2026-05-19 10:07:57.75417+00	\N
80a24f0d-0ec8-4f75-80df-4d14120b2eb1	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 10:10:44.649303+00	\N
48ee625d-dbf2-4663-9fcd-7a4e98d337ae	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 10:10:55.356732+00	\N
f1601f72-4f53-45aa-96ad-d299b42b7676	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_LOCKED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5", "fail_count": 3}	127.0.0.1	2026-05-19 10:10:55.364432+00	\N
8897971d-f843-4299-a1eb-fd6e9a4fb87e	00000000-0000-0000-0000-000000000001	STAFF_PIN_LOCK_CLEARED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	\N	127.0.0.1	2026-05-19 10:11:34.488326+00	\N
8a984458-95b2-48ca-815b-9d2b91ec56ac	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 10:12:06.068766+00	\N
debb7cf3-4873-4e63-9f2b-11340f21d057	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 10:12:09.473665+00	\N
fc0bee0e-ecdf-4d05-a57b-46a2b450b43c	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 10:12:09.916206+00	\N
9dce1d0d-ada2-4a78-b8c4-84e7a959a5bb	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_LOCKED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5", "fail_count": 3}	127.0.0.1	2026-05-19 10:12:09.922845+00	\N
70856d1d-1b51-4a62-bc13-175b3943cb5e	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 10:12:24.478082+00	\N
8ef32be8-0366-4bfb-87dc-a422d3527ce7	00000000-0000-0000-0000-000000000001	STAFF_PIN_RESET	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	\N	127.0.0.1	2026-05-19 10:12:57.176527+00	\N
7ee3c7be-a27d-45e2-b54a-f7bed5321ae6	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"permissions": ["networker.manage", "networker.view"], "action_pin_reset": true}	127.0.0.1	2026-05-19 10:12:57.189651+00	\N
90234489-1f83-4efb-b394-362a306abc8f	00000000-0000-0000-0000-000000000001	STAFF_PIN_LOCK_CLEARED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	\N	127.0.0.1	2026-05-19 10:13:03.779972+00	\N
7d979a70-c947-4a5b-b8c0-61037292f0b0	2fe361c7-90ac-4586-b007-fdffdd77a9b8	STAFF_PIN_DENIED	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"endpoint": "PATCH /api/v1/admin/users/8dc57588-4f0f-4313-99bd-0605425f0ec5"}	127.0.0.1	2026-05-19 11:45:50.969056+00	\N
b9b236d1-ee38-417a-9e42-981e4ccc0c9b	2fe361c7-90ac-4586-b007-fdffdd77a9b8	SUB_ADMIN_USER_STATUS	USER	8dc57588-4f0f-4313-99bd-0605425f0ec5	{"status": "BLOCKED"}	127.0.0.1	2026-05-19 11:46:34.201559+00	\N
476649b1-c0ba-457e-9a7d-16222f4d454b	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"permissions": ["networker.view", "networker.manage", "placement.view", "placement.manage", "kyc.view", "kyc.manage", "withdraw.view", "withdraw.manage", "ledger.view", "income_direct.view", "income_binary.view", "packages.view", "packages.manage", "notifications.view", "notifications.manage", "platform_config.commission_placement.manage", "platform_config.withdrawals.manage", "platform_config.p2p.manage", "platform_config.level_bonus.manage"]}	127.0.0.1	2026-05-19 11:47:06.903163+00	\N
49d3238f-8080-4a6b-8b65-fd113b848b97	00000000-0000-0000-0000-000000000001	STAFF_PIN_RESET	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	\N	127.0.0.1	2026-05-19 11:47:19.295097+00	\N
f46cee37-373a-4307-bd12-12978801bc59	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"permissions": ["income_binary.view", "income_direct.view", "kyc.manage", "kyc.view", "ledger.view", "networker.manage", "networker.view", "notifications.manage", "notifications.view", "packages.manage", "packages.view", "placement.manage", "placement.view", "platform_config.commission_placement.manage", "platform_config.level_bonus.manage", "platform_config.p2p.manage", "platform_config.withdrawals.manage", "withdraw.manage", "withdraw.view"], "action_pin_reset": true}	127.0.0.1	2026-05-19 11:47:19.321071+00	\N
fa9ac662-478b-4f92-a8dc-4ade333b1f22	00000000-0000-0000-0000-000000000001	STAFF_STATUS	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"new": "INACTIVE", "old": "ACTIVE"}	127.0.0.1	2026-05-19 11:47:39.627464+00	\N
01ef00b3-f312-4952-8f37-e5aa6c41ce7e	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"status": "INACTIVE"}	127.0.0.1	2026-05-19 11:47:39.631066+00	\N
2bdb1f1f-7c2b-49c9-bb06-821370519fad	00000000-0000-0000-0000-000000000001	STAFF_STATUS	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"new": "ACTIVE", "old": "INACTIVE"}	127.0.0.1	2026-05-19 11:48:21.635333+00	\N
f7eb119b-1687-46fa-b247-ab361608b06b	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"status": "ACTIVE"}	127.0.0.1	2026-05-19 11:48:21.637947+00	\N
4f4bb47c-662c-4874-9411-cd4ce6b4a86d	00000000-0000-0000-0000-000000000001	STAFF_STATUS	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"new": "ACTIVE", "old": "INACTIVE"}	127.0.0.1	2026-05-19 11:48:23.991721+00	\N
fc9710ed-18f7-4304-9ed6-59b93ab75091	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"status": "ACTIVE"}	127.0.0.1	2026-05-19 11:48:23.994601+00	\N
8ba7783e-a730-4509-ba48-82932fa7150e	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	SUB_ADMIN_PAYOUT_CONFIG_UPDATE	CONFIG	withdrawal_allowed_dates_direct	{"config_key": "withdrawal_allowed_dates_direct"}	127.0.0.1	2026-05-19 11:49:02.397777+00	\N
4e21746c-4b83-44df-8202-9dafc498f478	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	SUB_ADMIN_PACKAGE_UPDATE	PACKAGE	a1111111-1111-1111-1111-111111111101	\N	127.0.0.1	2026-05-19 12:23:20.589238+00	\N
dbae5a37-9167-41e4-b1fd-90142e478609	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"permissions": ["networker.manage", "networker.view", "support.view", "support.manage"]}	127.0.0.1	2026-05-20 11:25:46.303808+00	\N
43f6ddd1-81a0-4f44-843a-2023ceaf8536	00000000-0000-0000-0000-000000000001	STAFF_PIN_RESET	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	\N	127.0.0.1	2026-05-20 11:26:09.011415+00	\N
7faf35d6-8a32-4562-aa28-2a482f0c522f	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	2fe361c7-90ac-4586-b007-fdffdd77a9b8	{"permissions": ["networker.manage", "networker.view", "support.manage", "support.view"], "action_pin_reset": true}	127.0.0.1	2026-05-20 11:26:09.03768+00	\N
c13c4f97-2783-4550-8e46-83753eb5ea04	00000000-0000-0000-0000-000000000001	STAFF_UPDATE	STAFF	a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	{"permissions": ["income_binary.view", "income_direct.view", "kyc.manage", "kyc.view", "ledger.view", "networker.manage", "networker.view", "notifications.manage", "notifications.view", "packages.manage", "packages.view", "placement.manage", "placement.view", "platform_config.commission_placement.manage", "platform_config.level_bonus.manage", "platform_config.p2p.manage", "platform_config.withdrawals.manage", "support.view", "withdraw.manage", "withdraw.view"]}	127.0.0.1	2026-05-20 11:45:18.997389+00	\N
5ae32718-b622-487a-8db7-4b9f2c11fdce	2fe361c7-90ac-4586-b007-fdffdd77a9b8	SUB_ADMIN_SUPPORT_ASSIGN	SUPPORT	91b2af8e-6ef2-47d0-9493-81145ded996d	{"status": "in_progress", "subject": "testing-sub-admin-3", "user_name": "faizan ansari", "user_sponsor_id": "SPF00018"}	127.0.0.1	2026-05-20 11:53:29.416794+00	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36
\.


--
-- Data for Name: binary_tree; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.binary_tree (id, user_id, parent_id, leg, left_child_id, right_child_id, left_bv, right_bv, created_at, lifetime_left_bv, lifetime_right_bv) FROM stdin;
90	2ce7f55c-a219-42ff-be28-1cb9d9131cbd	e0a9d3d2-ecaf-4102-979b-bbf6bfee445d	LEFT	23a432a4-f7a1-4f5e-9e30-0444d6bdca03	\N	0	0	2026-04-22 04:09:25.967572+00	0	0
28	628a78b1-7366-4126-bc29-37809192668b	7f3e3ef0-c120-4e47-b348-9e6839336a57	RIGHT	80aabf4a-dc17-49fb-8872-c3f22d258aef	06685f0a-7a3e-4231-b939-50160cdff79f	0	0	2026-04-21 04:48:06.621773+00	0	0
92	53698f48-c8e7-4c7c-bf36-af472c557ccc	23a432a4-f7a1-4f5e-9e30-0444d6bdca03	LEFT	161e28f3-3fe2-406e-afb9-6145b73b268b	\N	0	0	2026-04-22 04:19:15.822437+00	0	0
19	37e43ad5-2b26-4da9-b62a-5caac371d505	c2a57bf6-388d-4e60-bdd2-506e87b5f14f	LEFT	90065828-1126-45ae-a2b4-125ba6919b50	6f0d51e9-1714-498f-9434-39c23d589992	0	0	2026-04-18 07:36:38.354272+00	0	0
35	203d321b-d01d-45fa-9961-75eebc985f92	90065828-1126-45ae-a2b4-125ba6919b50	LEFT	\N	\N	0	0	2026-04-21 05:15:39.356666+00	0	0
93	161e28f3-3fe2-406e-afb9-6145b73b268b	53698f48-c8e7-4c7c-bf36-af472c557ccc	LEFT	6d5bd5dd-e992-4bbc-b6b1-4cdb474a8e96	\N	0	0	2026-04-22 04:26:59.45073+00	0	0
89	e0a9d3d2-ecaf-4102-979b-bbf6bfee445d	0f399427-88c2-49c2-a429-6e2ce5a5a5a4	LEFT	2ce7f55c-a219-42ff-be28-1cb9d9131cbd	486554b1-2b13-4378-9e53-fa8cfeed79c4	0	0	2026-04-22 04:02:00.622635+00	0	0
39	971e68d8-05d9-4eef-8242-d67886e454b2	e46dc861-e0db-4261-af4e-671985abea7d	LEFT	\N	\N	0	0	2026-04-21 05:25:44.71421+00	0	0
104	0da59fa2-94c9-496b-a866-8d3bf43605f2	357791aa-2a95-4f16-8255-250fdef7a64e	LEFT	\N	\N	0	0	2026-04-30 10:59:59.179436+00	0	0
95	486554b1-2b13-4378-9e53-fa8cfeed79c4	e0a9d3d2-ecaf-4102-979b-bbf6bfee445d	RIGHT	c869adb1-5489-495e-a570-d68ba4263afc	fc1a4f4f-d50b-4d21-a715-14c5b1d05319	0	0	2026-04-22 08:47:19.428323+00	0	0
99	fc1a4f4f-d50b-4d21-a715-14c5b1d05319	486554b1-2b13-4378-9e53-fa8cfeed79c4	RIGHT	1abd0533-b176-4629-8021-7714628436e1	\N	0	0	2026-04-25 09:11:28.751814+00	0	0
37	ac81637e-4495-47e2-99b7-5acfe66bf85a	69fa2d9f-a41b-443e-a8df-2a90e69bef08	RIGHT	46eb76bf-4da9-46e5-b6fb-19d65c590ef2	510221a0-262d-4521-b3c5-202b205e4bab	0	0	2026-04-21 05:21:30.280831+00	0	0
101	f8405811-9d0d-4389-91ed-228c2b53d085	1abd0533-b176-4629-8021-7714628436e1	LEFT	\N	\N	0	0	2026-04-25 09:34:45.689503+00	0	0
102	d910266a-2e16-4fd2-bc18-2ea6247710b7	06685f0a-7a3e-4231-b939-50160cdff79f	RIGHT	\N	\N	0	0	2026-04-27 10:59:20.878441+00	0	0
14	69fa2d9f-a41b-443e-a8df-2a90e69bef08	b95015cf-9563-416e-b9a2-1c5391daa923	RIGHT	f265ce24-1bdc-4bb4-a455-a19efb3c030b	ac81637e-4495-47e2-99b7-5acfe66bf85a	0	0	2026-04-18 07:36:38.354272+00	0	0
22	7cf96627-8a21-4f29-bdfd-521ed3a19cdb	6f4c6872-e632-4d0d-9641-46cc3cb499c8	LEFT	23495a8d-1e44-4ec0-b803-4d61879b332f	\N	0	0	2026-04-20 13:02:39.321353+00	0	0
24	23495a8d-1e44-4ec0-b803-4d61879b332f	7cf96627-8a21-4f29-bdfd-521ed3a19cdb	LEFT	f432f642-7ae8-4661-83a4-f38471ba43de	\N	0	0	2026-04-20 19:17:17.390973+00	0	0
18	c2a57bf6-388d-4e60-bdd2-506e87b5f14f	16eeae3a-8c8b-4be3-a046-49a768d72b0b	LEFT	37e43ad5-2b26-4da9-b62a-5caac371d505	7f3e3ef0-c120-4e47-b348-9e6839336a57	0	0	2026-04-18 07:36:38.354272+00	0	0
105	47241e8a-4bf2-4798-8342-803e56abcea8	8dc73f24-c578-41b8-8a63-01616d96e120	RIGHT	\N	\N	0	0	2026-05-02 10:44:20.362276+00	0	0
66	8dc73f24-c578-41b8-8a63-01616d96e120	19169d69-818e-4dab-99c9-e55f34bc04e7	LEFT	d8029db4-097b-4562-b074-8806f6918392	47241e8a-4bf2-4798-8342-803e56abcea8	0	0	2026-04-21 13:32:17.069394+00	0	0
97	1ecf6715-cd2d-432f-8cd4-798001fa0626	efd24093-d64e-4ebd-82c0-77c5c820fb3f	RIGHT	\N	c68bd25b-8da6-4d2b-935f-b099cc0aa37f	0	0	2026-04-24 04:40:11.82109+00	0	0
46	cc1f69ca-d0fd-4c9e-b11d-f4c4f0c7c5a8	80aabf4a-dc17-49fb-8872-c3f22d258aef	RIGHT	\N	\N	0	0	2026-04-21 05:40:34.493797+00	0	0
32	80aabf4a-dc17-49fb-8872-c3f22d258aef	628a78b1-7366-4126-bc29-37809192668b	LEFT	6c24cdc2-b2d2-435b-b492-3d2ab0c9dd8d	cc1f69ca-d0fd-4c9e-b11d-f4c4f0c7c5a8	0	0	2026-04-21 05:12:26.999278+00	0	0
71	77ad76e2-1037-4cbf-b4cc-0b7064f9deaf	eea46fd3-1cfa-47d2-bfdf-1a83683b7db4	LEFT	9dc5f4bc-3b01-4048-b2ac-e9353fe6ae82	edcf14cf-4709-46b0-b20f-118855b44c41	34900	0	2026-04-21 13:43:34.606347+00	0	0
48	c8de016b-bb8c-4855-b884-a64ef59b813e	6f0d51e9-1714-498f-9434-39c23d589992	LEFT	\N	\N	0	0	2026-04-21 06:01:59.31617+00	0	0
34	6f0d51e9-1714-498f-9434-39c23d589992	37e43ad5-2b26-4da9-b62a-5caac371d505	RIGHT	c8de016b-bb8c-4855-b884-a64ef59b813e	\N	0	0	2026-04-21 05:14:23.329263+00	0	0
44	0f27ca84-3038-4396-887d-c7b9624943c3	f6730f2b-459d-4e31-b7d2-1c6eeca90ebe	RIGHT	b2d76696-c206-4c6b-bf0d-b0c2432cd8d3	fa061211-7e53-4cee-910a-b67ccea17902	0	0	2026-04-21 05:35:36.830833+00	0	0
50	3b924ad9-a0d6-41f1-a0f5-31af802c9daf	16eeae3a-8c8b-4be3-a046-49a768d72b0b	RIGHT	\N	\N	0	0	2026-04-21 09:27:09.160796+00	0	0
17	16eeae3a-8c8b-4be3-a046-49a768d72b0b	a7394bca-0cce-40e5-bd33-8865c446be30	LEFT	c2a57bf6-388d-4e60-bdd2-506e87b5f14f	3b924ad9-a0d6-41f1-a0f5-31af802c9daf	0	0	2026-04-18 07:36:38.354272+00	0	0
62	eea46fd3-1cfa-47d2-bfdf-1a83683b7db4	fac8f692-bba7-442d-9411-16a06d0e83f1	RIGHT	77ad76e2-1037-4cbf-b4cc-0b7064f9deaf	d4460733-944f-4a33-92c7-1bdd8049ba38	34900	0	2026-04-21 13:21:11.347358+00	0	0
52	1fbda134-030f-414a-a68e-3ee4600712bd	76bbea29-111c-4442-ae0a-a3609108dafb	RIGHT	\N	\N	0	0	2026-04-21 09:41:03.960484+00	0	0
42	76bbea29-111c-4442-ae0a-a3609108dafb	f6730f2b-459d-4e31-b7d2-1c6eeca90ebe	LEFT	a607f5d9-aad5-4647-a39f-984d4b6ab7b5	1fbda134-030f-414a-a68e-3ee4600712bd	0	0	2026-04-21 05:31:02.809341+00	0	0
56	51fddd76-3f47-4db4-8b4f-91b0d7f02441	a6bb75ca-6c40-4f43-8548-d5cdfb425f9b	RIGHT	\N	\N	0	0	2026-04-21 10:14:11.564889+00	0	0
54	a6bb75ca-6c40-4f43-8548-d5cdfb425f9b	06685f0a-7a3e-4231-b939-50160cdff79f	LEFT	017c9495-6ed8-4107-a590-60e31da1bb63	51fddd76-3f47-4db4-8b4f-91b0d7f02441	0	0	2026-04-21 10:04:22.002339+00	0	0
30	e46dc861-e0db-4261-af4e-671985abea7d	566d2c7b-ed80-479d-8510-8768757158f1	LEFT	971e68d8-05d9-4eef-8242-d67886e454b2	accc3e27-79c1-4ab0-a077-797f16e975ef	0	0	2026-04-21 05:01:51.604279+00	0	0
77	34bad088-04db-4018-a7e3-e06d77a20e0c	8d135246-a299-4d00-a537-d4f4364fcd96	RIGHT	\N	\N	0	0	2026-04-21 13:57:12.028232+00	0	0
12	b95015cf-9563-416e-b9a2-1c5391daa923	6843c544-e6bd-4589-80b7-9bf2da336422	LEFT	01907889-f3da-44a3-8018-e80a63d45e8f	69fa2d9f-a41b-443e-a8df-2a90e69bef08	0	0	2026-04-18 07:36:38.354272+00	0	0
15	22a3e85d-a774-4aa1-81e5-e14660cbd730	01907889-f3da-44a3-8018-e80a63d45e8f	LEFT	a7394bca-0cce-40e5-bd33-8865c446be30	ff934aea-8859-4132-a6dc-f86d13641248	0	0	2026-04-18 07:36:38.354272+00	0	0
60	67594aad-09c0-4f6e-9738-7c645edf009a	accc3e27-79c1-4ab0-a077-797f16e975ef	LEFT	4665c289-baf8-4e31-a151-51b16f1e5617	\N	0	0	2026-04-21 12:29:54.146821+00	0	0
16	a7394bca-0cce-40e5-bd33-8865c446be30	22a3e85d-a774-4aa1-81e5-e14660cbd730	LEFT	16eeae3a-8c8b-4be3-a046-49a768d72b0b	\N	0	0	2026-04-18 07:36:38.354272+00	0	0
82	49062bc2-2bab-4317-baa2-341ebe2dba8a	d4460733-944f-4a33-92c7-1bdd8049ba38	LEFT	2e28db5a-c199-4431-be69-23f925b1a5a5	492732e6-31f3-4ff7-95d7-dadc497fab37	0	0	2026-04-21 14:20:44.103733+00	0	0
58	accc3e27-79c1-4ab0-a077-797f16e975ef	e46dc861-e0db-4261-af4e-671985abea7d	RIGHT	67594aad-09c0-4f6e-9738-7c645edf009a	93fb28cf-5635-42e0-9ee0-7d11c14f0341	0	0	2026-04-21 12:19:58.589225+00	0	0
73	edcf14cf-4709-46b0-b20f-118855b44c41	77ad76e2-1037-4cbf-b4cc-0b7064f9deaf	RIGHT	27e7c4be-736f-4155-86a9-457fedeff6b9	a6270686-aa0f-4e9b-a4e1-63019c4cad90	0	0	2026-04-21 13:45:57.46265+00	0	0
108	6d70a8dd-a402-46c3-9d30-28eee39273e1	38bafbe2-873f-420c-916a-bd729660a76b	RIGHT	2eceebd3-eedf-46b0-bd94-edb9111debb7	e4dab429-54f0-420f-b794-6c5e23855ea5	381329	2827602	2026-05-04 08:36:39.760735+00	0	0
21	6f4c6872-e632-4d0d-9641-46cc3cb499c8	29a80af3-0b11-4673-908e-7d0689593d2c	LEFT	7cf96627-8a21-4f29-bdfd-521ed3a19cdb	\N	0	0	2026-04-20 13:00:16.476923+00	0	0
64	19169d69-818e-4dab-99c9-e55f34bc04e7	fb4b360e-ac02-40b0-b86c-89d08ab10d10	RIGHT	8dc73f24-c578-41b8-8a63-01616d96e120	9ccdfa2a-c35d-46d2-a4a4-21473f5c7603	0	0	2026-04-21 13:25:38.814239+00	0	0
75	7825ff2f-a068-4c6b-9c36-b7c852a903cd	d4460733-944f-4a33-92c7-1bdd8049ba38	RIGHT	\N	\N	0	0	2026-04-21 13:51:22.235815+00	0	0
41	f265ce24-1bdc-4bb4-a455-a19efb3c030b	69fa2d9f-a41b-443e-a8df-2a90e69bef08	LEFT	8d135246-a299-4d00-a537-d4f4364fcd96	40b96e2f-c6f0-4a50-99b5-d64acde7077b	0	0	2026-04-21 05:30:47.523897+00	0	0
79	3832450e-3f30-4cdf-9010-18a66b6c9979	5c2b1c5b-92e3-4138-99b1-b9f051a9e1f5	RIGHT	\N	\N	0	0	2026-04-21 14:06:42.06648+00	0	0
68	5c2b1c5b-92e3-4138-99b1-b9f051a9e1f5	088f209d-6fa8-43ba-81b2-778260b16f2a	LEFT	8883eff2-c014-44e5-a554-1aeac4bbba3a	3832450e-3f30-4cdf-9010-18a66b6c9979	0	0	2026-04-21 13:41:11.921299+00	0	0
13	01907889-f3da-44a3-8018-e80a63d45e8f	b95015cf-9563-416e-b9a2-1c5391daa923	LEFT	22a3e85d-a774-4aa1-81e5-e14660cbd730	0932abe8-ef98-4e6e-a1ea-2516f6bde4dc	0	0	2026-04-18 07:36:38.354272+00	0	0
69	d4460733-944f-4a33-92c7-1bdd8049ba38	eea46fd3-1cfa-47d2-bfdf-1a83683b7db4	RIGHT	49062bc2-2bab-4317-baa2-341ebe2dba8a	7825ff2f-a068-4c6b-9c36-b7c852a903cd	0	0	2026-04-21 13:41:30.830183+00	0	0
84	152c681f-d75f-47d3-8d65-3d31523d97d8	40b96e2f-c6f0-4a50-99b5-d64acde7077b	LEFT	\N	\N	0	0	2026-04-21 14:23:03.947095+00	0	0
43	40b96e2f-c6f0-4a50-99b5-d64acde7077b	f265ce24-1bdc-4bb4-a455-a19efb3c030b	RIGHT	152c681f-d75f-47d3-8d65-3d31523d97d8	0a58ed3f-e5b0-45fe-8644-ef7c9ef2c635	0	0	2026-04-21 05:33:53.948104+00	0	0
86	7617a48c-7023-4093-b604-7d0613cf6d27	46eb76bf-4da9-46e5-b6fb-19d65c590ef2	LEFT	\N	\N	0	0	2026-04-21 14:25:25.112481+00	0	0
80	0f399427-88c2-49c2-a429-6e2ce5a5a5a4	8d135246-a299-4d00-a537-d4f4364fcd96	LEFT	e0a9d3d2-ecaf-4102-979b-bbf6bfee445d	\N	0	0	2026-04-21 14:18:17.868602+00	0	0
26	7f3e3ef0-c120-4e47-b348-9e6839336a57	c2a57bf6-388d-4e60-bdd2-506e87b5f14f	RIGHT	566d2c7b-ed80-479d-8510-8768757158f1	628a78b1-7366-4126-bc29-37809192668b	0	0	2026-04-21 04:41:43.209717+00	0	0
91	23a432a4-f7a1-4f5e-9e30-0444d6bdca03	2ce7f55c-a219-42ff-be28-1cb9d9131cbd	LEFT	53698f48-c8e7-4c7c-bf36-af472c557ccc	\N	0	0	2026-04-22 04:13:57.32053+00	0	0
11	6843c544-e6bd-4589-80b7-9bf2da336422	f432f642-7ae8-4661-83a4-f38471ba43de	LEFT	b95015cf-9563-416e-b9a2-1c5391daa923	\N	0	252386	2026-04-18 07:36:38.354272+00	0	0
25	f432f642-7ae8-4661-83a4-f38471ba43de	23495a8d-1e44-4ec0-b803-4d61879b332f	LEFT	6843c544-e6bd-4589-80b7-9bf2da336422	\N	0	0	2026-04-20 19:19:29.729462+00	0	0
94	6d5bd5dd-e992-4bbc-b6b1-4cdb474a8e96	161e28f3-3fe2-406e-afb9-6145b73b268b	LEFT	\N	\N	0	0	2026-04-22 05:08:34.619303+00	0	0
110	74a10a58-62b0-4845-ae1b-fb401cfe330b	9ccdfa2a-c35d-46d2-a4a4-21473f5c7603	LEFT	\N	\N	0	0	2026-05-05 02:40:12.709837+00	0	0
27	566d2c7b-ed80-479d-8510-8768757158f1	7f3e3ef0-c120-4e47-b348-9e6839336a57	LEFT	e46dc861-e0db-4261-af4e-671985abea7d	f6730f2b-459d-4e31-b7d2-1c6eeca90ebe	0	0	2026-04-21 04:46:04.276848+00	0	0
96	2df522bd-313c-471f-8fa4-bdee5baa7503	357791aa-2a95-4f16-8255-250fdef7a64e	RIGHT	\N	\N	0	0	2026-04-23 18:05:35.819677+00	0	0
36	a4a5f931-5018-4b2d-aa47-0290853c2280	90065828-1126-45ae-a2b4-125ba6919b50	RIGHT	\N	\N	0	0	2026-04-21 05:18:46.251935+00	0	0
33	90065828-1126-45ae-a2b4-125ba6919b50	37e43ad5-2b26-4da9-b62a-5caac371d505	LEFT	203d321b-d01d-45fa-9961-75eebc985f92	a4a5f931-5018-4b2d-aa47-0290853c2280	0	0	2026-04-21 05:13:06.383468+00	0	0
70	357791aa-2a95-4f16-8255-250fdef7a64e	088f209d-6fa8-43ba-81b2-778260b16f2a	RIGHT	0da59fa2-94c9-496b-a866-8d3bf43605f2	2df522bd-313c-471f-8fa4-bdee5baa7503	420000	0	2026-04-21 13:42:09.634556+00	0	0
65	088f209d-6fa8-43ba-81b2-778260b16f2a	fb4b360e-ac02-40b0-b86c-89d08ab10d10	LEFT	5c2b1c5b-92e3-4138-99b1-b9f051a9e1f5	357791aa-2a95-4f16-8255-250fdef7a64e	0	420000	2026-04-21 13:29:30.454386+00	0	0
31	f6730f2b-459d-4e31-b7d2-1c6eeca90ebe	566d2c7b-ed80-479d-8510-8768757158f1	RIGHT	76bbea29-111c-4442-ae0a-a3609108dafb	0f27ca84-3038-4396-887d-c7b9624943c3	0	0	2026-04-21 05:06:26.438163+00	0	0
45	6c24cdc2-b2d2-435b-b492-3d2ab0c9dd8d	80aabf4a-dc17-49fb-8872-c3f22d258aef	LEFT	\N	\N	0	0	2026-04-21 05:38:21.357999+00	0	0
47	b2d76696-c206-4c6b-bf0d-b0c2432cd8d3	0f27ca84-3038-4396-887d-c7b9624943c3	LEFT	\N	\N	0	0	2026-04-21 05:45:29.403501+00	0	0
51	a607f5d9-aad5-4647-a39f-984d4b6ab7b5	76bbea29-111c-4442-ae0a-a3609108dafb	LEFT	\N	\N	0	0	2026-04-21 09:38:06.862355+00	0	0
53	d1b8d3c3-e29b-48f2-8439-452581b7f86c	fa061211-7e53-4cee-910a-b67ccea17902	RIGHT	\N	\N	0	0	2026-04-21 09:57:09.442613+00	0	0
55	017c9495-6ed8-4107-a590-60e31da1bb63	a6bb75ca-6c40-4f43-8548-d5cdfb425f9b	LEFT	\N	\N	0	0	2026-04-21 10:11:14.748587+00	0	0
57	749e4960-30d1-401d-82da-60a7e80d749b	fa061211-7e53-4cee-910a-b67ccea17902	LEFT	\N	\N	0	0	2026-04-21 10:20:37.067591+00	0	0
49	fa061211-7e53-4cee-910a-b67ccea17902	0f27ca84-3038-4396-887d-c7b9624943c3	RIGHT	749e4960-30d1-401d-82da-60a7e80d749b	d1b8d3c3-e29b-48f2-8439-452581b7f86c	0	0	2026-04-21 08:55:47.327865+00	0	0
59	93fb28cf-5635-42e0-9ee0-7d11c14f0341	accc3e27-79c1-4ab0-a077-797f16e975ef	RIGHT	\N	\N	0	0	2026-04-21 12:26:15.086914+00	0	0
61	4665c289-baf8-4e31-a151-51b16f1e5617	67594aad-09c0-4f6e-9738-7c645edf009a	LEFT	\N	\N	0	0	2026-04-21 13:15:39.297578+00	0	0
100	1abd0533-b176-4629-8021-7714628436e1	fc1a4f4f-d50b-4d21-a715-14c5b1d05319	LEFT	f8405811-9d0d-4389-91ed-228c2b53d085	\N	0	0	2026-04-25 09:20:42.684779+00	0	0
29	06685f0a-7a3e-4231-b939-50160cdff79f	628a78b1-7366-4126-bc29-37809192668b	RIGHT	a6bb75ca-6c40-4f43-8548-d5cdfb425f9b	d910266a-2e16-4fd2-bc18-2ea6247710b7	0	0	2026-04-21 04:52:26.621498+00	0	0
67	d8029db4-097b-4562-b074-8806f6918392	8dc73f24-c578-41b8-8a63-01616d96e120	LEFT	\N	\N	0	0	2026-04-21 13:37:10.47198+00	0	0
72	9ccdfa2a-c35d-46d2-a4a4-21473f5c7603	19169d69-818e-4dab-99c9-e55f34bc04e7	RIGHT	74a10a58-62b0-4845-ae1b-fb401cfe330b	525a24fb-eba0-4e99-90a8-3f83ea21e242	0	0	2026-04-21 13:44:32.040817+00	0	0
78	8883eff2-c014-44e5-a554-1aeac4bbba3a	5c2b1c5b-92e3-4138-99b1-b9f051a9e1f5	LEFT	\N	\N	0	0	2026-04-21 14:05:37.932642+00	0	0
76	8d135246-a299-4d00-a537-d4f4364fcd96	f265ce24-1bdc-4bb4-a455-a19efb3c030b	LEFT	0f399427-88c2-49c2-a429-6e2ce5a5a5a4	34bad088-04db-4018-a7e3-e06d77a20e0c	0	0	2026-04-21 13:55:46.142639+00	0	0
81	0932abe8-ef98-4e6e-a1ea-2516f6bde4dc	01907889-f3da-44a3-8018-e80a63d45e8f	RIGHT	\N	\N	0	0	2026-04-21 14:20:10.580832+00	0	0
83	0a58ed3f-e5b0-45fe-8644-ef7c9ef2c635	40b96e2f-c6f0-4a50-99b5-d64acde7077b	RIGHT	\N	\N	0	0	2026-04-21 14:22:09.480586+00	0	0
85	e46cfef0-7110-479e-972f-e7d10b271a44	46eb76bf-4da9-46e5-b6fb-19d65c590ef2	RIGHT	\N	\N	0	0	2026-04-21 14:24:20.687589+00	0	0
40	46eb76bf-4da9-46e5-b6fb-19d65c590ef2	ac81637e-4495-47e2-99b7-5acfe66bf85a	LEFT	7617a48c-7023-4093-b604-7d0613cf6d27	e46cfef0-7110-479e-972f-e7d10b271a44	0	0	2026-04-21 05:27:12.814747+00	0	0
87	a361e4a1-3d73-4c18-bcb1-4dd42b243a65	510221a0-262d-4521-b3c5-202b205e4bab	RIGHT	\N	\N	0	0	2026-04-21 14:26:03.068694+00	0	0
38	510221a0-262d-4521-b3c5-202b205e4bab	ac81637e-4495-47e2-99b7-5acfe66bf85a	RIGHT	\N	a361e4a1-3d73-4c18-bcb1-4dd42b243a65	0	0	2026-04-21 05:23:23.066882+00	0	0
88	ff934aea-8859-4132-a6dc-f86d13641248	22a3e85d-a774-4aa1-81e5-e14660cbd730	RIGHT	\N	\N	0	0	2026-04-21 15:37:39.802729+00	0	0
111	65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	9dc5f4bc-3b01-4048-b2ac-e9353fe6ae82	RIGHT	\N	\N	0	0	2026-05-05 08:38:12.565303+00	0	0
118	b5c04e4c-a400-49e6-bc3a-abe94f0994f4	9dc5f4bc-3b01-4048-b2ac-e9353fe6ae82	LEFT	\N	\N	0	0	2026-05-10 10:36:26.377054+00	0	0
63	fb4b360e-ac02-40b0-b86c-89d08ab10d10	fac8f692-bba7-442d-9411-16a06d0e83f1	LEFT	088f209d-6fa8-43ba-81b2-778260b16f2a	19169d69-818e-4dab-99c9-e55f34bc04e7	450000	0	2026-04-21 13:24:15.203933+00	0	0
113	73a9297f-6a3d-44db-ad4f-e41ec0691b6e	3e094f9e-3cfe-41b1-beac-81cdc9e09837	RIGHT	\N	\N	0	0	2026-05-08 17:32:40.399411+00	0	0
106	c68bd25b-8da6-4d2b-935f-b099cc0aa37f	1ecf6715-cd2d-432f-8cd4-798001fa0626	RIGHT	\N	\N	0	0	2026-05-03 01:33:24.438509+00	0	0
107	3e094f9e-3cfe-41b1-beac-81cdc9e09837	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	3e67a955-a614-443e-ba4a-d7ce2d15d38b	73a9297f-6a3d-44db-ad4f-e41ec0691b6e	0	0	2026-05-03 09:19:19.471561+00	0	0
114	2eceebd3-eedf-46b0-bd94-edb9111debb7	6d70a8dd-a402-46c3-9d30-28eee39273e1	LEFT	\N	\N	0	0	2026-05-09 11:27:03.330242+00	0	0
109	525a24fb-eba0-4e99-90a8-3f83ea21e242	9ccdfa2a-c35d-46d2-a4a4-21473f5c7603	RIGHT	\N	\N	0	0	2026-05-04 09:43:21.129151+00	0	0
10	fac8f692-bba7-442d-9411-16a06d0e83f1	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	RIGHT	fb4b360e-ac02-40b0-b86c-89d08ab10d10	eea46fd3-1cfa-47d2-bfdf-1a83683b7db4	415100	0	2026-04-18 07:36:38.354272+00	0	0
115	b6f878e7-ed5d-4337-a253-7a6e46f947ae	29a80af3-0b11-4673-908e-7d0689593d2c	RIGHT	\N	\N	0	0	2026-05-09 12:22:32.427809+00	0	0
23	29a80af3-0b11-4673-908e-7d0689593d2c	fca2b6d8-e405-4838-b85f-80919fe0c362	LEFT	6f4c6872-e632-4d0d-9641-46cc3cb499c8	b6f878e7-ed5d-4337-a253-7a6e46f947ae	0	0	2026-04-20 13:05:49.00075+00	0	0
122	492732e6-31f3-4ff7-95d7-dadc497fab37	49062bc2-2bab-4317-baa2-341ebe2dba8a	RIGHT	\N	\N	0	0	2026-05-14 11:04:06.468826+00	0	0
117	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	e4dab429-54f0-420f-b794-6c5e23855ea5	LEFT	\N	\N	0	0	2026-05-09 21:13:58.865056+00	0	0
9	fca2b6d8-e405-4838-b85f-80919fe0c362	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	LEFT	29a80af3-0b11-4673-908e-7d0689593d2c	efd24093-d64e-4ebd-82c0-77c5c820fb3f	0	7254469	2026-04-18 07:36:38.354272+00	0	0
103	38bafbe2-873f-420c-916a-bd729660a76b	efd24093-d64e-4ebd-82c0-77c5c820fb3f	LEFT	3e094f9e-3cfe-41b1-beac-81cdc9e09837	6d70a8dd-a402-46c3-9d30-28eee39273e1	0	2818931	2026-04-29 01:16:40.454276+00	0	0
20	efd24093-d64e-4ebd-82c0-77c5c820fb3f	fca2b6d8-e405-4838-b85f-80919fe0c362	RIGHT	38bafbe2-873f-420c-916a-bd729660a76b	1ecf6715-cd2d-432f-8cd4-798001fa0626	5871576	0	2026-04-18 10:03:57.087967+00	0	0
74	9dc5f4bc-3b01-4048-b2ac-e9353fe6ae82	77ad76e2-1037-4cbf-b4cc-0b7064f9deaf	LEFT	b5c04e4c-a400-49e6-bc3a-abe94f0994f4	65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	0	34900	2026-04-21 13:48:50.662125+00	0	0
98	c869adb1-5489-495e-a570-d68ba4263afc	486554b1-2b13-4378-9e53-fa8cfeed79c4	LEFT	f432c0c4-8cc5-4766-97b5-e49536cc9b9e	\N	0	0	2026-04-25 07:47:14.982157+00	0	0
120	a6270686-aa0f-4e9b-a4e1-63019c4cad90	edcf14cf-4709-46b0-b20f-118855b44c41	RIGHT	\N	\N	0	0	2026-05-10 16:38:30.633047+00	0	0
121	ea32b62d-eac8-421e-8c7c-4a6deaca6673	f432c0c4-8cc5-4766-97b5-e49536cc9b9e	RIGHT	\N	\N	0	0	2026-05-10 16:49:30.298561+00	0	0
119	f432c0c4-8cc5-4766-97b5-e49536cc9b9e	c869adb1-5489-495e-a570-d68ba4263afc	LEFT	\N	ea32b62d-eac8-421e-8c7c-4a6deaca6673	0	0	2026-05-10 16:37:49.795717+00	0	0
8	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	\N	\N	fca2b6d8-e405-4838-b85f-80919fe0c362	fac8f692-bba7-442d-9411-16a06d0e83f1	8109519	0	2026-04-18 07:36:38.354272+00	0	0
123	2e28db5a-c199-4431-be69-23f925b1a5a5	49062bc2-2bab-4317-baa2-341ebe2dba8a	LEFT	\N	\N	0	0	2026-05-14 11:13:16.18606+00	0	0
124	27e7c4be-736f-4155-86a9-457fedeff6b9	edcf14cf-4709-46b0-b20f-118855b44c41	LEFT	\N	\N	0	0	2026-05-14 13:48:49.771216+00	0	0
116	e4dab429-54f0-420f-b794-6c5e23855ea5	6d70a8dd-a402-46c3-9d30-28eee39273e1	RIGHT	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	\N	1936236	0	2026-05-09 20:31:01.597352+00	0	0
125	8dc57588-4f0f-4313-99bd-0605425f0ec5	3e67a955-a614-443e-ba4a-d7ce2d15d38b	LEFT	\N	\N	0	0	2026-05-16 08:31:57.019919+00	0	0
112	3e67a955-a614-443e-ba4a-d7ce2d15d38b	3e094f9e-3cfe-41b1-beac-81cdc9e09837	LEFT	8dc57588-4f0f-4313-99bd-0605425f0ec5	\N	0	0	2026-05-08 11:32:42.944807+00	0	0
\.


--
-- Data for Name: bv_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bv_ledger (id, user_id, source_user_id, leg, bv_amount, order_reference, status, matched_at, created_at) FROM stdin;
1	6843c544-e6bd-4589-80b7-9bf2da336422	efd24093-d64e-4ebd-82c0-77c5c820fb3f	RIGHT	252386	e1f6537e-383d-4955-b898-7fbdc3530bf9	UNMATCHED	\N	2026-04-18 10:06:43.551256+00
5	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	6843c544-e6bd-4589-80b7-9bf2da336422	LEFT	378579	925e2b1a-ee54-4a4f-bb50-b5b585e50392	UNMATCHED	\N	2026-04-18 11:33:23.559669+00
7	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	6843c544-e6bd-4589-80b7-9bf2da336422	LEFT	39010	617b260f-a9cc-4f57-ba39-c21daf901680	UNMATCHED	\N	2026-04-19 06:33:18.635313+00
2	fca2b6d8-e405-4838-b85f-80919fe0c362	efd24093-d64e-4ebd-82c0-77c5c820fb3f	LEFT	252386	e1f6537e-383d-4955-b898-7fbdc3530bf9	MATCHED	2026-04-22 12:36:29.55584+00	2026-04-18 10:06:43.635536+00
8	fca2b6d8-e405-4838-b85f-80919fe0c362	efd24093-d64e-4ebd-82c0-77c5c820fb3f	RIGHT	252386	3e50bc13-457e-477b-8b53-27b32879441f	MATCHED	2026-04-22 12:36:29.732135+00	2026-04-22 12:36:29.075654+00
9	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	efd24093-d64e-4ebd-82c0-77c5c820fb3f	LEFT	252386	3e50bc13-457e-477b-8b53-27b32879441f	UNMATCHED	\N	2026-04-22 12:36:31.088724+00
10	fca2b6d8-e405-4838-b85f-80919fe0c362	efd24093-d64e-4ebd-82c0-77c5c820fb3f	RIGHT	1680000	181632e0-255b-4c0b-bf5f-299716652b81	UNMATCHED	\N	2026-04-24 06:06:35.801235+00
6	fca2b6d8-e405-4838-b85f-80919fe0c362	6843c544-e6bd-4589-80b7-9bf2da336422	LEFT	39010	617b260f-a9cc-4f57-ba39-c21daf901680	MATCHED	2026-04-24 06:06:35.92493+00	2026-04-19 06:33:18.456586+00
4	fca2b6d8-e405-4838-b85f-80919fe0c362	6843c544-e6bd-4589-80b7-9bf2da336422	LEFT	378579	925e2b1a-ee54-4a4f-bb50-b5b585e50392	MATCHED	2026-04-24 06:06:35.92493+00	2026-04-18 11:33:23.450922+00
11	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	efd24093-d64e-4ebd-82c0-77c5c820fb3f	LEFT	1680000	181632e0-255b-4c0b-bf5f-299716652b81	UNMATCHED	\N	2026-04-24 06:06:36.128449+00
12	efd24093-d64e-4ebd-82c0-77c5c820fb3f	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	504771	bb3fb6dd-8068-4c10-affc-7988ae82dc79	UNMATCHED	\N	2026-04-29 01:16:40.529611+00
13	fca2b6d8-e405-4838-b85f-80919fe0c362	38bafbe2-873f-420c-916a-bd729660a76b	RIGHT	504771	bb3fb6dd-8068-4c10-affc-7988ae82dc79	UNMATCHED	\N	2026-04-29 01:16:40.571733+00
14	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	504771	bb3fb6dd-8068-4c10-affc-7988ae82dc79	UNMATCHED	\N	2026-04-29 01:16:40.581691+00
15	357791aa-2a95-4f16-8255-250fdef7a64e	0da59fa2-94c9-496b-a866-8d3bf43605f2	LEFT	120000	34581300-7639-49ec-a233-ece7e9a3e006	UNMATCHED	\N	2026-04-30 10:59:59.46988+00
16	088f209d-6fa8-43ba-81b2-778260b16f2a	0da59fa2-94c9-496b-a866-8d3bf43605f2	RIGHT	120000	34581300-7639-49ec-a233-ece7e9a3e006	UNMATCHED	\N	2026-04-30 10:59:59.657375+00
17	fb4b360e-ac02-40b0-b86c-89d08ab10d10	0da59fa2-94c9-496b-a866-8d3bf43605f2	LEFT	120000	34581300-7639-49ec-a233-ece7e9a3e006	UNMATCHED	\N	2026-04-30 10:59:59.785888+00
18	fac8f692-bba7-442d-9411-16a06d0e83f1	0da59fa2-94c9-496b-a866-8d3bf43605f2	LEFT	120000	34581300-7639-49ec-a233-ece7e9a3e006	UNMATCHED	\N	2026-04-30 10:59:59.815939+00
19	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	0da59fa2-94c9-496b-a866-8d3bf43605f2	RIGHT	120000	34581300-7639-49ec-a233-ece7e9a3e006	MATCHED	2026-04-30 10:59:59.964503+00	2026-04-30 10:59:59.876156+00
20	357791aa-2a95-4f16-8255-250fdef7a64e	0da59fa2-94c9-496b-a866-8d3bf43605f2	LEFT	300000	1cb1410a-a7a7-480c-9772-c68957d36496	UNMATCHED	\N	2026-04-30 11:00:10.938727+00
21	088f209d-6fa8-43ba-81b2-778260b16f2a	0da59fa2-94c9-496b-a866-8d3bf43605f2	RIGHT	300000	1cb1410a-a7a7-480c-9772-c68957d36496	UNMATCHED	\N	2026-04-30 11:00:12.331519+00
22	fb4b360e-ac02-40b0-b86c-89d08ab10d10	0da59fa2-94c9-496b-a866-8d3bf43605f2	LEFT	300000	1cb1410a-a7a7-480c-9772-c68957d36496	UNMATCHED	\N	2026-04-30 11:00:12.679906+00
23	fac8f692-bba7-442d-9411-16a06d0e83f1	0da59fa2-94c9-496b-a866-8d3bf43605f2	LEFT	300000	1cb1410a-a7a7-480c-9772-c68957d36496	UNMATCHED	\N	2026-04-30 11:00:12.927825+00
3	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	efd24093-d64e-4ebd-82c0-77c5c820fb3f	LEFT	252386	e1f6537e-383d-4955-b898-7fbdc3530bf9	MATCHED	2026-04-30 11:00:14.882671+00	2026-04-18 10:06:43.66627+00
24	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	0da59fa2-94c9-496b-a866-8d3bf43605f2	RIGHT	300000	1cb1410a-a7a7-480c-9772-c68957d36496	MATCHED	2026-04-30 11:00:15.093521+00	2026-04-30 11:00:13.078477+00
25	fb4b360e-ac02-40b0-b86c-89d08ab10d10	088f209d-6fa8-43ba-81b2-778260b16f2a	LEFT	30000	762a759a-28c9-4772-9a24-1adfa98280f7	UNMATCHED	\N	2026-05-02 12:15:52.525444+00
26	fac8f692-bba7-442d-9411-16a06d0e83f1	088f209d-6fa8-43ba-81b2-778260b16f2a	LEFT	30000	762a759a-28c9-4772-9a24-1adfa98280f7	UNMATCHED	\N	2026-05-02 12:15:52.573467+00
27	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	088f209d-6fa8-43ba-81b2-778260b16f2a	RIGHT	30000	762a759a-28c9-4772-9a24-1adfa98280f7	MATCHED	2026-05-02 12:15:52.743128+00	2026-05-02 12:15:52.612594+00
28	efd24093-d64e-4ebd-82c0-77c5c820fb3f	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	1546261	f623ebc5-9b1a-43af-8710-864dc5e59593	UNMATCHED	\N	2026-05-03 03:35:21.886544+00
29	fca2b6d8-e405-4838-b85f-80919fe0c362	38bafbe2-873f-420c-916a-bd729660a76b	RIGHT	1546261	f623ebc5-9b1a-43af-8710-864dc5e59593	UNMATCHED	\N	2026-05-03 03:35:22.063911+00
30	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	1546261	f623ebc5-9b1a-43af-8710-864dc5e59593	UNMATCHED	\N	2026-05-03 03:35:22.369416+00
31	38bafbe2-873f-420c-916a-bd729660a76b	3e094f9e-3cfe-41b1-beac-81cdc9e09837	LEFT	390000	5d68ab62-cd9e-4a1b-b55f-f076b8f2ccfd	UNMATCHED	\N	2026-05-03 09:24:40.883285+00
32	efd24093-d64e-4ebd-82c0-77c5c820fb3f	3e094f9e-3cfe-41b1-beac-81cdc9e09837	LEFT	390000	5d68ab62-cd9e-4a1b-b55f-f076b8f2ccfd	UNMATCHED	\N	2026-05-03 09:24:41.112883+00
33	fca2b6d8-e405-4838-b85f-80919fe0c362	3e094f9e-3cfe-41b1-beac-81cdc9e09837	RIGHT	390000	5d68ab62-cd9e-4a1b-b55f-f076b8f2ccfd	UNMATCHED	\N	2026-05-03 09:24:41.302748+00
34	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	3e094f9e-3cfe-41b1-beac-81cdc9e09837	LEFT	390000	5d68ab62-cd9e-4a1b-b55f-f076b8f2ccfd	UNMATCHED	\N	2026-05-03 09:24:41.673036+00
35	efd24093-d64e-4ebd-82c0-77c5c820fb3f	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	28339	4955c2ec-1b10-4e5f-b10f-2587c7ceaf4a	UNMATCHED	\N	2026-05-03 09:44:21.276655+00
36	fca2b6d8-e405-4838-b85f-80919fe0c362	38bafbe2-873f-420c-916a-bd729660a76b	RIGHT	28339	4955c2ec-1b10-4e5f-b10f-2587c7ceaf4a	UNMATCHED	\N	2026-05-03 09:44:21.4796+00
37	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	28339	4955c2ec-1b10-4e5f-b10f-2587c7ceaf4a	UNMATCHED	\N	2026-05-03 09:44:21.508928+00
38	efd24093-d64e-4ebd-82c0-77c5c820fb3f	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	28339	e7b07a12-ba23-42aa-b4b2-9f1d2ba94371	UNMATCHED	\N	2026-05-04 06:13:03.876951+00
39	fca2b6d8-e405-4838-b85f-80919fe0c362	38bafbe2-873f-420c-916a-bd729660a76b	RIGHT	28339	e7b07a12-ba23-42aa-b4b2-9f1d2ba94371	UNMATCHED	\N	2026-05-04 06:13:08.817456+00
40	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	28339	e7b07a12-ba23-42aa-b4b2-9f1d2ba94371	UNMATCHED	\N	2026-05-04 06:13:09.149613+00
41	efd24093-d64e-4ebd-82c0-77c5c820fb3f	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	30431	a8f674ce-a01d-481c-aaaf-44598840e7ee	UNMATCHED	\N	2026-05-04 06:26:54.394115+00
42	fca2b6d8-e405-4838-b85f-80919fe0c362	38bafbe2-873f-420c-916a-bd729660a76b	RIGHT	30431	a8f674ce-a01d-481c-aaaf-44598840e7ee	UNMATCHED	\N	2026-05-04 06:26:54.70758+00
43	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	30431	a8f674ce-a01d-481c-aaaf-44598840e7ee	UNMATCHED	\N	2026-05-04 06:26:54.92895+00
44	efd24093-d64e-4ebd-82c0-77c5c820fb3f	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	30035	369019e1-7510-4888-8a15-f56aa147d460	UNMATCHED	\N	2026-05-04 06:27:34.463264+00
45	fca2b6d8-e405-4838-b85f-80919fe0c362	38bafbe2-873f-420c-916a-bd729660a76b	RIGHT	30035	369019e1-7510-4888-8a15-f56aa147d460	UNMATCHED	\N	2026-05-04 06:27:35.001319+00
46	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	30035	369019e1-7510-4888-8a15-f56aa147d460	UNMATCHED	\N	2026-05-04 06:27:35.231545+00
47	efd24093-d64e-4ebd-82c0-77c5c820fb3f	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	74038	14307809-7034-45d1-bb35-b4140e14bcb2	UNMATCHED	\N	2026-05-04 06:28:13.931955+00
48	fca2b6d8-e405-4838-b85f-80919fe0c362	38bafbe2-873f-420c-916a-bd729660a76b	RIGHT	74038	14307809-7034-45d1-bb35-b4140e14bcb2	UNMATCHED	\N	2026-05-04 06:28:14.20539+00
49	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	74038	14307809-7034-45d1-bb35-b4140e14bcb2	UNMATCHED	\N	2026-05-04 06:28:14.613366+00
50	efd24093-d64e-4ebd-82c0-77c5c820fb3f	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	30431	7eba7e86-724f-4ce7-87dd-60fc476614a5	UNMATCHED	\N	2026-05-04 06:44:49.637311+00
51	fca2b6d8-e405-4838-b85f-80919fe0c362	38bafbe2-873f-420c-916a-bd729660a76b	RIGHT	30431	7eba7e86-724f-4ce7-87dd-60fc476614a5	UNMATCHED	\N	2026-05-04 06:44:50.055686+00
52	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	38bafbe2-873f-420c-916a-bd729660a76b	LEFT	30431	7eba7e86-724f-4ce7-87dd-60fc476614a5	UNMATCHED	\N	2026-05-04 06:44:51.242629+00
53	9dc5f4bc-3b01-4048-b2ac-e9353fe6ae82	65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	RIGHT	34900	368400c2-4c41-412b-ae19-a20f74120c3c	UNMATCHED	\N	2026-05-05 08:38:12.945809+00
54	77ad76e2-1037-4cbf-b4cc-0b7064f9deaf	65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	LEFT	34900	368400c2-4c41-412b-ae19-a20f74120c3c	UNMATCHED	\N	2026-05-05 08:38:13.266179+00
55	eea46fd3-1cfa-47d2-bfdf-1a83683b7db4	65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	LEFT	34900	368400c2-4c41-412b-ae19-a20f74120c3c	UNMATCHED	\N	2026-05-05 08:38:13.302736+00
56	fac8f692-bba7-442d-9411-16a06d0e83f1	65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	RIGHT	34900	368400c2-4c41-412b-ae19-a20f74120c3c	MATCHED	2026-05-05 08:38:13.50542+00	2026-05-05 08:38:13.338927+00
57	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	RIGHT	34900	368400c2-4c41-412b-ae19-a20f74120c3c	MATCHED	2026-05-05 08:38:13.961164+00	2026-05-05 08:38:13.925053+00
58	6d70a8dd-a402-46c3-9d30-28eee39273e1	2eceebd3-eedf-46b0-bd94-edb9111debb7	LEFT	381329	c6e2ca8c-6fe3-4542-8002-0da1d04d2c5b	UNMATCHED	\N	2026-05-09 19:23:47.931771+00
59	38bafbe2-873f-420c-916a-bd729660a76b	2eceebd3-eedf-46b0-bd94-edb9111debb7	RIGHT	381329	c6e2ca8c-6fe3-4542-8002-0da1d04d2c5b	MATCHED	2026-05-09 19:23:47.986955+00	2026-05-09 19:23:47.95159+00
60	efd24093-d64e-4ebd-82c0-77c5c820fb3f	2eceebd3-eedf-46b0-bd94-edb9111debb7	LEFT	381329	c6e2ca8c-6fe3-4542-8002-0da1d04d2c5b	UNMATCHED	\N	2026-05-09 19:23:48.047996+00
61	fca2b6d8-e405-4838-b85f-80919fe0c362	2eceebd3-eedf-46b0-bd94-edb9111debb7	RIGHT	381329	c6e2ca8c-6fe3-4542-8002-0da1d04d2c5b	UNMATCHED	\N	2026-05-09 19:23:48.059178+00
62	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2eceebd3-eedf-46b0-bd94-edb9111debb7	LEFT	381329	c6e2ca8c-6fe3-4542-8002-0da1d04d2c5b	UNMATCHED	\N	2026-05-09 19:23:48.071499+00
63	6d70a8dd-a402-46c3-9d30-28eee39273e1	e4dab429-54f0-420f-b794-6c5e23855ea5	RIGHT	891366	479fd902-4186-4f51-822f-4bdcfbf56987	UNMATCHED	\N	2026-05-09 20:43:17.901597+00
64	38bafbe2-873f-420c-916a-bd729660a76b	e4dab429-54f0-420f-b794-6c5e23855ea5	RIGHT	891366	479fd902-4186-4f51-822f-4bdcfbf56987	UNMATCHED	\N	2026-05-09 20:43:17.917916+00
65	efd24093-d64e-4ebd-82c0-77c5c820fb3f	e4dab429-54f0-420f-b794-6c5e23855ea5	LEFT	891366	479fd902-4186-4f51-822f-4bdcfbf56987	UNMATCHED	\N	2026-05-09 20:43:17.983161+00
66	fca2b6d8-e405-4838-b85f-80919fe0c362	e4dab429-54f0-420f-b794-6c5e23855ea5	RIGHT	891366	479fd902-4186-4f51-822f-4bdcfbf56987	UNMATCHED	\N	2026-05-09 20:43:17.993537+00
67	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	e4dab429-54f0-420f-b794-6c5e23855ea5	LEFT	891366	479fd902-4186-4f51-822f-4bdcfbf56987	UNMATCHED	\N	2026-05-09 20:43:18.005393+00
68	e4dab429-54f0-420f-b794-6c5e23855ea5	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	LEFT	1909429	5a36f4df-98a7-421b-bc19-de6d6bbd369e	UNMATCHED	\N	2026-05-09 21:13:58.901249+00
69	6d70a8dd-a402-46c3-9d30-28eee39273e1	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	RIGHT	1909429	5a36f4df-98a7-421b-bc19-de6d6bbd369e	UNMATCHED	\N	2026-05-09 21:13:58.922454+00
70	38bafbe2-873f-420c-916a-bd729660a76b	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	RIGHT	1909429	5a36f4df-98a7-421b-bc19-de6d6bbd369e	UNMATCHED	\N	2026-05-09 21:13:58.931968+00
71	efd24093-d64e-4ebd-82c0-77c5c820fb3f	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	LEFT	1909429	5a36f4df-98a7-421b-bc19-de6d6bbd369e	UNMATCHED	\N	2026-05-09 21:13:58.939836+00
72	fca2b6d8-e405-4838-b85f-80919fe0c362	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	RIGHT	1909429	5a36f4df-98a7-421b-bc19-de6d6bbd369e	UNMATCHED	\N	2026-05-09 21:13:58.946489+00
73	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	LEFT	1909429	5a36f4df-98a7-421b-bc19-de6d6bbd369e	UNMATCHED	\N	2026-05-09 21:13:58.954273+00
74	fca2b6d8-e405-4838-b85f-80919fe0c362	efd24093-d64e-4ebd-82c0-77c5c820fb3f	RIGHT	120482	8545aa97-b80e-4f24-906d-b82eeb3cc46a	UNMATCHED	\N	2026-05-10 21:35:53.323433+00
75	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	efd24093-d64e-4ebd-82c0-77c5c820fb3f	LEFT	120482	8545aa97-b80e-4f24-906d-b82eeb3cc46a	UNMATCHED	\N	2026-05-10 21:35:53.356385+00
76	e4dab429-54f0-420f-b794-6c5e23855ea5	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	LEFT	26807	1cba9abd-22e5-4ba6-98cf-6c415324d4ef	UNMATCHED	\N	2026-05-15 18:41:47.27831+00
77	6d70a8dd-a402-46c3-9d30-28eee39273e1	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	RIGHT	26807	1cba9abd-22e5-4ba6-98cf-6c415324d4ef	UNMATCHED	\N	2026-05-15 18:41:47.336774+00
78	38bafbe2-873f-420c-916a-bd729660a76b	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	RIGHT	26807	1cba9abd-22e5-4ba6-98cf-6c415324d4ef	UNMATCHED	\N	2026-05-15 18:41:47.357262+00
79	efd24093-d64e-4ebd-82c0-77c5c820fb3f	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	LEFT	26807	1cba9abd-22e5-4ba6-98cf-6c415324d4ef	UNMATCHED	\N	2026-05-15 18:41:47.372848+00
80	fca2b6d8-e405-4838-b85f-80919fe0c362	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	RIGHT	26807	1cba9abd-22e5-4ba6-98cf-6c415324d4ef	UNMATCHED	\N	2026-05-15 18:41:47.387148+00
81	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	LEFT	26807	1cba9abd-22e5-4ba6-98cf-6c415324d4ef	UNMATCHED	\N	2026-05-15 18:41:47.403903+00
\.


--
-- Data for Name: commission_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.commission_config (id, config_key, config_value, updated_by, updated_at) FROM stdin;
1	direct_commission_percent	{"value": 10}	\N	2026-04-18 00:27:05.374133+00
2	binary_match_percent	{"value": 10}	\N	2026-04-18 00:27:05.374133+00
3	franchise_commission_percent	{"value": 10}	\N	2026-04-18 00:27:05.374133+00
4	carry_forward_flush_enabled	{"value": false}	\N	2026-04-18 00:27:05.374133+00
5	carry_forward_flush_period	{"value": "never"}	\N	2026-04-18 00:27:05.374133+00
8	placement_hold_hours	{"value": 48}	\N	2026-04-18 00:27:05.374133+00
9	placement_weaker_by	{"value": "subtree_bv"}	\N	2026-04-18 00:27:05.374133+00
10	p2p_enabled	{"value": true}	\N	2026-04-18 00:27:07.151295+00
11	p2p_min_amount_paise	{"value": 10000}	\N	2026-04-18 00:27:07.151295+00
12	p2p_service_charge_percent	{"value": 2}	\N	2026-04-18 00:27:07.151295+00
6	ratio_rule_enabled	{"value": true}	\N	2026-05-15 12:25:15.446368+00
7	ratio_rule_max	{"value": 30}	\N	2026-05-15 12:25:15.466423+00
\.


--
-- Data for Name: daily_pair_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_pair_stats (id, user_id, stat_date, pairs_today, total_pairs_lifetime, created_at, updated_at) FROM stdin;
1	fca2b6d8-e405-4838-b85f-80919fe0c362	2026-04-22	1	1	2026-04-22 12:36:30.202134+00	2026-04-22 12:36:30.202134+00
2	fca2b6d8-e405-4838-b85f-80919fe0c362	2026-04-24	1	1	2026-04-24 06:06:36.039715+00	2026-04-24 06:06:36.039715+00
3	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-04-30	2	2	2026-04-30 11:00:01.53363+00	2026-04-30 11:00:17.25835+00
5	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-05-02	1	1	2026-05-02 12:15:53.089265+00	2026-05-02 12:15:53.089265+00
6	fac8f692-bba7-442d-9411-16a06d0e83f1	2026-05-05	1	1	2026-05-05 08:38:13.796601+00	2026-05-05 08:38:13.796601+00
7	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-05-05	1	1	2026-05-05 08:38:14.081204+00	2026-05-05 08:38:14.081204+00
8	38bafbe2-873f-420c-916a-bd729660a76b	2026-05-09	2	2	2026-05-09 19:23:48.03489+00	2026-05-09 20:43:17.965798+00
\.


--
-- Data for Name: dashboard_home_content; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dashboard_home_content (id, slider_slides, notices, updated_at) FROM stdin;
1	[{"id": "slide-1777288347794-wd97a", "caption": "", "image_url": "https://mlm-cdn.b-cdn.net/landing_sliders/landing_slider_1766130242356.jpg", "sort_order": 0}]	[]	2026-04-27 11:15:20.14595+00
\.


--
-- Data for Name: fmcg_api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fmcg_api_keys (id, app_name, api_key, api_secret, status, created_at) FROM stdin;
1	FMCG-Dev	fmcg-dev-key-change-me	fmcg-dev-secret-change-me	ACTIVE	2026-04-18 00:27:06.124749+00
2	Secure-Pharma FMCG	fmcg_pk_3XsAQEjlx9UwsIw8QITBV1	fmcg_sk_qjYW0MuoURDMLOPak5X9co2xE40m0y	ACTIVE	2026-04-18 01:49:30.035467+00
\.


--
-- Data for Name: held_income; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.held_income (id, user_id, wallet_type, source, amount, reference_id, reference_type, description, period_ym, status, released_ledger_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: kyc_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kyc_documents (document_id, kyc_id, document_type, document_url, file_name, file_size, mime_type, uploaded_at) FROM stdin;
f7fa0ae6-98c2-4c18-bb72-39071bb00eb4	1bbf5a90-ec31-436d-b249-47b3aefab211	PAN_CARD	fmcg-binary/kyc/c2a57bf6-388d-4e60-bdd2-506e87b5f14f/1bbf5a90-ec31-436d-b249-47b3aefab211/0b09bbcd-4ae6-4fd0-a3d2-102a5720d237_image.jpg	image.jpg	552953	image/jpeg	2026-04-21 03:58:38.864154+00
1cef61cb-0d6d-4ba7-9a38-f8ffe5418e71	1bbf5a90-ec31-436d-b249-47b3aefab211	AADHAAR_FRONT	fmcg-binary/kyc/c2a57bf6-388d-4e60-bdd2-506e87b5f14f/1bbf5a90-ec31-436d-b249-47b3aefab211/96001fc9-907f-419d-b799-415c94f76f72_17767440447264903684881150503150.jpg	17767440447264903684881150503150.jpg	3361708	image/jpeg	2026-04-21 04:01:15.204184+00
c838fd24-2e9e-4242-9eb8-41c5f5bdf209	1bbf5a90-ec31-436d-b249-47b3aefab211	AADHAAR_BACK	fmcg-binary/kyc/c2a57bf6-388d-4e60-bdd2-506e87b5f14f/1bbf5a90-ec31-436d-b249-47b3aefab211/700c4862-70e6-42fe-bfde-d1962ec24b24_17767441032171872270994729108139.jpg	17767441032171872270994729108139.jpg	4170015	image/jpeg	2026-04-21 04:02:05.613135+00
21da980f-751d-4c21-abc4-6fbf291d6694	1bbf5a90-ec31-436d-b249-47b3aefab211	BANK_PASSBOOK	fmcg-binary/kyc/c2a57bf6-388d-4e60-bdd2-506e87b5f14f/1bbf5a90-ec31-436d-b249-47b3aefab211/5dc85ceb-bc60-4fc1-a9bc-5332a2cc77da_17767444265596443259246736478847.jpg	17767444265596443259246736478847.jpg	3286920	image/jpeg	2026-04-21 04:07:32.458741+00
6d2ff848-594e-4d6e-aa0a-43de9b4aa9dc	1bbf5a90-ec31-436d-b249-47b3aefab211	BANK_PASSBOOK	fmcg-binary/kyc/c2a57bf6-388d-4e60-bdd2-506e87b5f14f/1bbf5a90-ec31-436d-b249-47b3aefab211/3fe5962a-bf21-416c-a3d8-f281feb014f3_17767445684088361983106281353363.jpg	17767445684088361983106281353363.jpg	3935230	image/jpeg	2026-04-21 04:09:58.369153+00
872c29f6-71df-42e0-b26a-c4d2c0e1745e	a0700427-75c0-4829-9571-26bd2e979869	PAN_CARD	fmcg-binary/kyc/8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a/a0700427-75c0-4829-9571-26bd2e979869/ad0019aa-d94e-423c-9434-281bf17ce4d8_Screenshot_2025-09-23_at_7.21.10_PM.png	Screenshot 2025-09-23 at 7.21.10 PM.png	492713	image/png	2026-05-10 08:27:41.652148+00
363d4913-1115-41b7-88c0-39ee2407b37d	7c73cf85-3d2f-4759-9894-d318a8f7e974	PAN_CARD	fmcg-binary/kyc/efd24093-d64e-4ebd-82c0-77c5c820fb3f/7c73cf85-3d2f-4759-9894-d318a8f7e974/ccea127c-736a-4a4f-8259-f58eeb6ce5e9_Photo_on_23-09-25_at_7.23_PM.jpg	Photo on 23-09-25 at 7.23 PM.jpg	143490	image/jpeg	2026-05-10 08:28:28.506107+00
8a73f84f-8367-4ff9-9e85-60572380625a	7c73cf85-3d2f-4759-9894-d318a8f7e974	AADHAAR_FRONT	fmcg-binary/kyc/efd24093-d64e-4ebd-82c0-77c5c820fb3f/7c73cf85-3d2f-4759-9894-d318a8f7e974/f8fd8c08-5847-41a0-a29e-a2fe89f55530_Photo_on_23-09-25_at_7.23_PM.jpg	Photo on 23-09-25 at 7.23 PM.jpg	143490	image/jpeg	2026-05-10 08:28:35.612288+00
71a2e2a6-d157-4e3a-bb6a-97717f4a7059	7c73cf85-3d2f-4759-9894-d318a8f7e974	AADHAAR_BACK	fmcg-binary/kyc/efd24093-d64e-4ebd-82c0-77c5c820fb3f/7c73cf85-3d2f-4759-9894-d318a8f7e974/7ee0bd6e-e5a7-4634-9b35-5a7d73988b51_Photo_on_23-09-25_at_7.23_PM.jpg	Photo on 23-09-25 at 7.23 PM.jpg	143490	image/jpeg	2026-05-10 08:28:41.26466+00
23c5752d-99a0-4135-91b4-333f02beef11	7c73cf85-3d2f-4759-9894-d318a8f7e974	BANK_PASSBOOK	fmcg-binary/kyc/efd24093-d64e-4ebd-82c0-77c5c820fb3f/7c73cf85-3d2f-4759-9894-d318a8f7e974/d373a302-35bb-44df-bbbb-faea584acd51_Photo_on_23-09-25_at_7.23_PM.jpg	Photo on 23-09-25 at 7.23 PM.jpg	143490	image/jpeg	2026-05-10 08:28:45.970676+00
\.


--
-- Data for Name: kyc_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kyc_requests (kyc_id, user_id, status, rejection_reason, admin_id, submitted_at, reviewed_at, created_at, updated_at) FROM stdin;
1bbf5a90-ec31-436d-b249-47b3aefab211	c2a57bf6-388d-4e60-bdd2-506e87b5f14f	SUBMITTED	\N	\N	2026-04-21 04:10:11.846326+00	\N	2026-04-21 03:58:36.757547+00	2026-04-21 04:10:11.846326+00
a0700427-75c0-4829-9571-26bd2e979869	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	PENDING	\N	\N	\N	\N	2026-05-10 08:27:39.516677+00	2026-05-10 08:27:39.516677+00
7c73cf85-3d2f-4759-9894-d318a8f7e974	efd24093-d64e-4ebd-82c0-77c5c820fb3f	REJECTED	please diff docs upload	00000000-0000-0000-0000-000000000001	2026-05-10 08:28:47.802953+00	2026-05-10 08:29:28.964752+00	2026-05-10 08:28:25.421984+00	2026-05-10 08:29:28.964752+00
\.


--
-- Data for Name: level_achievements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.level_achievements (id, user_id, level_number, total_bv_at_achievement, achieved_at) FROM stdin;
\.


--
-- Data for Name: level_bonus_slabs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.level_bonus_slabs (id, bonus_percent, is_active, updated_at, level_number, min_total_bv_paise) FROM stdin;
21	0.00	t	2026-04-20 18:23:11.471385+00	0	0
22	1.00	t	2026-04-20 18:23:11.471385+00	1	5000000
23	1.25	t	2026-04-20 18:23:11.471385+00	2	10000000
24	1.40	t	2026-04-20 18:23:11.471385+00	3	25000000
25	1.50	t	2026-04-20 18:23:11.471385+00	4	50000000
26	1.60	t	2026-04-20 18:23:11.471385+00	5	100000000
27	1.75	t	2026-04-20 18:23:11.471385+00	6	250000000
28	2.00	t	2026-04-20 18:23:11.471385+00	7	500000000
29	2.10	t	2026-04-20 18:23:11.471385+00	8	1000000000
30	2.25	t	2026-04-20 18:23:11.471385+00	9	2500000000
31	2.50	t	2026-04-20 18:23:11.471385+00	10	5000000000
\.


--
-- Data for Name: networker_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.networker_users (user_id, sponsor_id, sponsor_user_id, full_name, email, phone, password_hash, status, role, current_package_id, package_activated_at, today_binary_earned, daily_binary_cap, placement_status, created_at, updated_at, avatar_object_key, payout_upi_id, payout_bank_display, secure_wallet_external_id, secure_wallet_balance_paise, transaction_password_hash, monthly_income_paise, monthly_shopping_paise, income_period_ym, current_level, sc_wallet_code, sc_linked_at, staff_created_by, staff_last_login_at, staff_action_pin_hash, admin_title, admin_title_image_object_key) FROM stdin;
492732e6-31f3-4ff7-95d7-dadc497fab37	SPF00118	eea46fd3-1cfa-47d2-bfdf-1a83683b7db4	Mujeeb Khan	hamoodkhan6786@gmail.com	+918275286636	TOTB9898@	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-14 11:04:05.479889+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
accc3e27-79c1-4ab0-a077-797f16e975ef	SPF00051	e46dc861-e0db-4261-af4e-671985abea7d	Jyoti Vijay Sutawane	coolakashbagade@gmail.com	+917058276160	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 12:19:58.454033+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
4665c289-baf8-4e31-a151-51b16f1e5617	SPF00054	67594aad-09c0-4f6e-9738-7c645edf009a	Vandana Vijay Kulkarni	mrakashbagade@gmail.com	+918626073275	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:15:38.873728+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
19169d69-818e-4dab-99c9-e55f34bc04e7	SPF00057	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Tahezeeb sheikh	kalbibilalsheikh@gmail.com	+918329278132	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:25:38.681231+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
7617a48c-7023-4093-b604-7d0613cf6d27	SPF00081	b95015cf-9563-416e-b9a2-1c5391daa923	Pankaj jumnake	pankaj@gmail.con	94045484494	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:25:25.013218+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
a361e4a1-3d73-4c18-bcb1-4dd42b243a65	SPF00082	b95015cf-9563-416e-b9a2-1c5391daa923	Rahul jumnake	rahul@gmail.com	97648484894	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:26:02.958266+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
74a10a58-62b0-4845-ae1b-fb401cfe330b	SPF00104	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Maria	maria2020fernandis@gmail.com	+918765432111	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-03 02:40:05.504524+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
8dc73f24-c578-41b8-8a63-01616d96e120	SPF00059	19169d69-818e-4dab-99c9-e55f34bc04e7	Naushin sheikh	snaushin49@gmail.com	+919423824673	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:32:16.876804+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
d4460733-944f-4a33-92c7-1bdd8049ba38	SPF00062	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Heena Sheikh	heena@gmail.com	+918623548562	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:41:30.810595+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
486554b1-2b13-4378-9e53-fa8cfeed79c4	SPF00091	e0a9d3d2-ecaf-4102-979b-bbf6bfee445d	Pramila Meshram	psmeshram1234@gmail.com	+919423671505	300480	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-22 08:47:19.34816+00	2026-05-16 00:01:00.011665+00	fmcg-binary/avatars/486554b1-2b13-4378-9e53-fa8cfeed79c4/ed829dad-cb10-43bd-8125-2b8f8d0b25ce_1000801698.jpg	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
6d5bd5dd-e992-4bbc-b6b1-4cdb474a8e96	SPF00090	161e28f3-3fe2-406e-afb9-6145b73b268b	DIPAK BALBUDHE	balbudhedeepak@gmail.com	+918412935743	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-22 05:08:34.493323+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
6f0d51e9-1714-498f-9434-39c23d589992	SPF00027	16eeae3a-8c8b-4be3-a046-49a768d72b0b	Ashish D	meghaat77@gmail.com	+919921050016	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:14:23.281681+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
a6270686-aa0f-4e9b-a4e1-63019c4cad90	SPF00111	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Aman Singh	aman.trueinception.in@gmail.com	+915419963132	123456789	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-08 16:37:46.15266+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
566d2c7b-ed80-479d-8510-8768757158f1	SPF00020	7f3e3ef0-c120-4e47-b348-9e6839336a57	Gopal Laxman Bagade	bagadegopalrao@gmail.com	+919881620320	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 04:46:03.931077+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
69fa2d9f-a41b-443e-a8df-2a90e69bef08	SPF00017	fca2b6d8-e405-4838-b85f-80919fe0c362	Snehalata Gadpayle	snehalata.gadpayle@gmail.com	+919764501456	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-18 02:28:44.759773+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
80aabf4a-dc17-49fb-8872-c3f22d258aef	SPF00025	628a78b1-7366-4126-bc29-37809192668b	Nilesh Mahadeo Rahate	rahate083@gmail.com	+919822711573	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:12:26.947438+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
088f209d-6fa8-43ba-81b2-778260b16f2a	SPF00058	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Faizan sheikh	faizan1234@gmail.com	+917666113262	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:29:30.246345+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	30000	202605	0	\N	\N	\N	\N	\N	\N	\N
fb4b360e-ac02-40b0-b86c-89d08ab10d10	SPF00056	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Priyanka gajbhiye	gajbhiyepriyanka682@gmail.com	+919422452987	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:24:14.968449+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
d1b8d3c3-e29b-48f2-8439-452581b7f86c	SPF00046	fa061211-7e53-4cee-910a-b67ccea17902	Santosh Jagannath Wawge	santoshwawge12@gmail.com	+919834793392	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 09:57:09.115796+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
29a80af3-0b11-4673-908e-7d0689593d2c	SPF00004	fca2b6d8-e405-4838-b85f-80919fe0c362	Left-Leg Reserve Account	left-leg-reserve@spf.com	+919333333333	12345678	INACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-20 13:56:29.426839+00	0	0	PLACED	2026-04-20 13:05:48.80869+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
b6f878e7-ed5d-4337-a253-7a6e46f947ae	SPF00109	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Ansari Noorafsha	anbsajid@gmail.com	+918482825075	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-08 11:24:50.184292+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
f432c0c4-8cc5-4766-97b5-e49536cc9b9e	SPF00116	486554b1-2b13-4378-9e53-fa8cfeed79c4	RAKESH NANDKISHOR VAIDHYA	vaidyarakesh02@gmail.com	+917620525233	test@1234	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-10 16:37:49.77163+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
8883eff2-c014-44e5-a554-1aeac4bbba3a	SPF00073	fb4b360e-ac02-40b0-b86c-89d08ab10d10	Akshay landge	akshaylandge288@gmail.com	+919168485359	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:05:37.566066+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
ff934aea-8859-4132-a6dc-f86d13641248	SPF00083	22a3e85d-a774-4aa1-81e5-e14660cbd730	Manikrao Ragho Rangari	manikrangari05@gmail.com	+919405123131	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 15:37:39.739434+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
ac81637e-4495-47e2-99b7-5acfe66bf85a	SPF00030	69fa2d9f-a41b-443e-a8df-2a90e69bef08	AYUSH GADPAYLE	ayushgadpayle@gmail.com	+918999343483	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:21:30.16781+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
46eb76bf-4da9-46e5-b6fb-19d65c590ef2	SPF00033	69fa2d9f-a41b-443e-a8df-2a90e69bef08	RUCHI GADPAYLE	ruchigadpayle1@gmail.com	+917378806932	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:27:12.685958+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
5c2b1c5b-92e3-4138-99b1-b9f051a9e1f5	SPF00061	fb4b360e-ac02-40b0-b86c-89d08ab10d10	Sweety gajbhiye	sweetygajbhiye0302@gmail.com	+919075493173	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:41:11.700562+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
9dc5f4bc-3b01-4048-b2ac-e9353fe6ae82	SPF00067	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Sufiyan	sufiyan@gmail.com	+918745126580	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:48:50.598059+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
34bad088-04db-4018-a7e3-e06d77a20e0c	SPF00070	b95015cf-9563-416e-b9a2-1c5391daa923	PUJA PARWATKAR	pujaparwatkar@gmail.com	+911234567891	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:57:11.970768+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
fac8f692-bba7-442d-9411-16a06d0e83f1	SPF00003	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Right-Leg Base Account	right-leg-base@spf.com	+918100000003	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-18 07:51:53.888602+00	0	0	PLACED	2026-04-18 01:58:32.022754+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	4013	0	202605	0	\N	\N	\N	\N	\N	\N	\N
51fddd76-3f47-4db4-8b4f-91b0d7f02441	SPF00049	a6bb75ca-6c40-4f43-8548-d5cdfb425f9b	Bhagyashri Manoj Chopde	bhagyashrichopde786@gmail.com	+919309528072	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 10:14:11.193372+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
22a3e85d-a774-4aa1-81e5-e14660cbd730	SPF00012	fca2b6d8-e405-4838-b85f-80919fe0c362	Rajesh Ukey	rajesh.ukey@gmail.com	+919000000005	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-18 07:36:38.354272+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
a7394bca-0cce-40e5-bd33-8865c446be30	SPF00013	fca2b6d8-e405-4838-b85f-80919fe0c362	Sunil Temburne	sunil.temburne@gmail.com	+919000000006	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-18 07:36:38.354272+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
93fb28cf-5635-42e0-9ee0-7d11c14f0341	SPF00052	accc3e27-79c1-4ab0-a077-797f16e975ef	Nikunj Vijat Sutawane	nikunjsutawane123@gmail.com	+919881152466	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 12:26:15.029344+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
2e28db5a-c199-4431-be69-23f925b1a5a5	SPF00119	eea46fd3-1cfa-47d2-bfdf-1a83683b7db4	USMAN RAHIM SHEIKH	us15122005@gmail.com	+919175869971	US15122005	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-14 11:13:16.137908+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
1abd0533-b176-4629-8021-7714628436e1	SPF00095	fc1a4f4f-d50b-4d21-a715-14c5b1d05319	Malu R Khadse	malu121268@gmail.com	+919923785254	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-25 09:20:42.452594+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
1ecf6715-cd2d-432f-8cd4-798001fa0626	SPF00092	efd24093-d64e-4ebd-82c0-77c5c820fb3f	Aman Singh	aman-01@gmail.com	+916655443322	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-24 04:40:10.734851+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
d910266a-2e16-4fd2-bc18-2ea6247710b7	SPF00098	06685f0a-7a3e-4231-b939-50160cdff79f	Ashutosh	ashutosh.gangotri@gmail.com	+919266775559	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-27 10:59:19.405279+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
f6730f2b-459d-4e31-b7d2-1c6eeca90ebe	SPF00024	566d2c7b-ed80-479d-8510-8768757158f1	Anirudha Dnyaneshwar wawge	adwawge@gmail.com	+919028282578	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:06:26.258092+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
c7474b91-e3cb-4590-b2a9-4af0dbfe390f	SPF00115	e4dab429-54f0-420f-b794-6c5e23855ea5	noorain ansari	trueinception.in@gmail.com	+917719974291	12121212	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-05-09 21:03:57.837979+00	0	2500000	PLACED	2026-05-09 20:54:40.998565+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	1936236	202605	0	\N	\N	\N	\N	\N	\N	\N
ea32b62d-eac8-421e-8c7c-4a6deaca6673	SPF00117	f432c0c4-8cc5-4766-97b5-e49536cc9b9e	VAISHALI RAKESH VAIDHYA	rakeshvaidhya51@gmail.com	+919595444358	test@1234	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-10 16:49:30.263845+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
3e67a955-a614-443e-ba4a-d7ce2d15d38b	SPF00110	efd24093-d64e-4ebd-82c0-77c5c820fb3f	adnan	faizanvector@gmail.com	+918600000889	Test@1234	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-08 11:32:42.691578+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
27e7c4be-736f-4155-86a9-457fedeff6b9	SPF00120	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	UMAR RAMZAN SHEIKH	umar181180@gmail.com	+919765705700	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-14 13:48:49.664854+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	SPF00105	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Siddhant Gour	siddhantgour02@gmail.com	+919644282948	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-03 08:37:58.355567+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	34900	202605	0	\N	\N	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000001	SPF00000	\N	FMCG-Binary Admin	admin@fmcgbinary.local	\N	$2y$10$BV7wTFzvVlemzp9sloHO9.DKOaZaNoJt2IJwJ.EvWCRccWqQWIkfC	ACTIVE	ADMIN	\N	\N	0	0	PLACED	2026-04-18 00:27:03.724719+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
8d135246-a299-4d00-a537-d4f4364fcd96	SPF00069	b95015cf-9563-416e-b9a2-1c5391daa923	RUMABAI PARWATKAR	rumabaiparwatkar@gmail.com	+911234567890	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:55:45.808335+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
c2a57bf6-388d-4e60-bdd2-506e87b5f14f	SPF00015	fca2b6d8-e405-4838-b85f-80919fe0c362	Aakash Bagde	aakash.bagde@gmail.com	+919000000008	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-18 07:36:38.354272+00	2026-05-16 00:01:00.011665+00	fmcg-binary/avatars/c2a57bf6-388d-4e60-bdd2-506e87b5f14f/87a793a5-60c4-4b04-9889-24b2ef63ebe0_1000516529.png	\N	\N	\N	\N	$2a$10$886b6m4iumaJBFDrYPbvc.lNZleTroUCSECjb7/Wm5NCSW.PR2SsW	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
b5c04e4c-a400-49e6-bc3a-abe94f0994f4	SPF00108	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Zoya Ansari	ansarizoya2125@gmail.com	+919370404127	11223344	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-08 10:35:47.039479+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
a607f5d9-aad5-4647-a39f-984d4b6ab7b5	SPF00044	76bbea29-111c-4442-ae0a-a3609108dafb	Vitthal Dnyaneshwar Gayke	vitthalgayke@gmail.com	+919604743573	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 09:38:06.568886+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
49062bc2-2bab-4317-baa2-341ebe2dba8a	SPF00077	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Mohammad Shufiyan Abdul Salam Qureshi	qureshishufiyan01@gmail.com	+919529024882	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:20:43.607867+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
e46cfef0-7110-479e-972f-e7d10b271a44	SPF00080	b95015cf-9563-416e-b9a2-1c5391daa923	Priyansh Parwatkar	priayansh@gmail.com	649484944946	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:24:20.617261+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
2ce7f55c-a219-42ff-be28-1cb9d9131cbd	SPF00086	e0a9d3d2-ecaf-4102-979b-bbf6bfee445d	SUDESH SHENDE	shendesudesh76@gmail.com	+918412834528	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-22 04:09:25.889159+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
53698f48-c8e7-4c7c-bf36-af472c557ccc	SPF00088	23a432a4-f7a1-4f5e-9e30-0444d6bdca03	KALPANA AUTKAR	kalpana123autkar@gmail.com	+919309513783	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-22 04:19:15.72369+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
2df522bd-313c-471f-8fa4-bdee5baa7503	SPF00084	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Mohammad Shakir Mohammad Ismail	vidarbhaclinicallab@gmail.com	+91 86688 63131	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 18:05:07.752188+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
e0a9d3d2-ecaf-4102-979b-bbf6bfee445d	SPF00085	f265ce24-1bdc-4bb4-a455-a19efb3c030b	SHANKAR MESHRAM	shankarmeshram216@gmail.com	+919765931958	300480	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-22 04:02:00.18464+00	2026-05-16 00:01:00.011665+00	fmcg-binary/avatars/e0a9d3d2-ecaf-4102-979b-bbf6bfee445d/439a47c9-5388-4285-bd26-d502d3092716_1000744713.jpg	\N	\N	\N	\N	$2a$10$B1fsDfbAwcwCFFcPHdeWzed3pPWz.BvcdVBjIA5hHFHd39yNxD5d6	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
fc1a4f4f-d50b-4d21-a715-14c5b1d05319	SPF00094	486554b1-2b13-4378-9e53-fa8cfeed79c4	Ravindra M Khadse	ravindrakhadse29@gmail.com	+917820903616	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-25 09:11:28.697849+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
161e28f3-3fe2-406e-afb9-6145b73b268b	SPF00089	53698f48-c8e7-4c7c-bf36-af472c557ccc	SHANKAR SINGH PARIHAR	shankarparihas123@gmail.com	+919300895790	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-22 04:26:59.389639+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
fca2b6d8-e405-4838-b85f-80919fe0c362	SPF00002	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Left-Leg Base Account	left-leg-base@spf.com	+918100000002	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-18 07:51:53.888602+00	0	0	PLACED	2026-04-18 01:49:37.924678+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	12048	0	202605	0	\N	\N	\N	\N	\N	\N	\N
6c24cdc2-b2d2-435b-b492-3d2ab0c9dd8d	SPF00038	80aabf4a-dc17-49fb-8872-c3f22d258aef	Rupali Nilesh Rahate	rahate086@gmail.com	+917972273173	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:38:21.307775+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
e4dab429-54f0-420f-b794-6c5e23855ea5	SPF00114	efd24093-d64e-4ebd-82c0-77c5c820fb3f	hajra Ansari	tech2secure01@gmail.com	+917028720372	12121212	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111102	2026-05-09 20:43:17.84176+00	0	1000000	PLACED	2026-05-09 20:04:58.384904+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	193622	891366	202605	0	\N	\N	\N	\N	\N	\N	\N
c8de016b-bb8c-4855-b884-a64ef59b813e	SPF00041	c2a57bf6-388d-4e60-bdd2-506e87b5f14f	VIJAY BHOPLE	vsbhople12@gmail.com	+919423146856	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 06:01:59.273467+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
749e4960-30d1-401d-82da-60a7e80d749b	SPF00050	fa061211-7e53-4cee-910a-b67ccea17902	Gajanan Chandrabhan Wawge	gajananwawge111@gmail.com	+919552290703	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 10:20:37.002945+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
67594aad-09c0-4f6e-9738-7c645edf009a	SPF00053	accc3e27-79c1-4ab0-a077-797f16e975ef	Vijay Prabhakar Kulkarni	vijay786abc@gmail.com	+919172810566	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 12:29:54.084198+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
c68bd25b-8da6-4d2b-935f-b099cc0aa37f	SPF00101	efd24093-d64e-4ebd-82c0-77c5c820fb3f	Aman Singh	aman403forbidden@gmail.com	+914531234591	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-01 01:32:42.883058+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
0da59fa2-94c9-496b-a866-8d3bf43605f2	SPF00099	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Anees shaikh	aneesshaikh329@gmail.com	+919373220380	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-04-30 10:24:05.861391+00	0	300000	PLACED	2026-04-28 10:59:42.755483+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	420000	202604	0	\N	\N	\N	\N	\N	\N	\N
77ad76e2-1037-4cbf-b4cc-0b7064f9deaf	SPF00064	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Sana	sana@gmail.com	+916325987412	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:43:34.288438+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
73a9297f-6a3d-44db-ad4f-e41ec0691b6e	SPF00112	efd24093-d64e-4ebd-82c0-77c5c820fb3f	Aman 007	faizanvector@gmail.com	+918600000889	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-08 17:32:40.146682+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
7825ff2f-a068-4c6b-9c36-b7c852a903cd	SPF00068	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	umar	umar@gmail.com	+916845231478	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:51:22.186773+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
a6bb75ca-6c40-4f43-8548-d5cdfb425f9b	SPF00047	06685f0a-7a3e-4231-b939-50160cdff79f	Yogesh Wasudeo Chopde	ywchopde@gmail.com	+919011318282	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 10:04:21.945055+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
76bbea29-111c-4442-ae0a-a3609108dafb	SPF00035	f6730f2b-459d-4e31-b7d2-1c6eeca90ebe	Vandana Anirudha Wawge	vawawge1791@gmail.com	+919049927288	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:31:02.700154+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
357791aa-2a95-4f16-8255-250fdef7a64e	SPF00063	fb4b360e-ac02-40b0-b86c-89d08ab10d10	Shital gajbhiye	shitalgajbhiye909@gmail.com	+917066277546	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:42:09.493359+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
6843c544-e6bd-4589-80b7-9bf2da336422	SPF00009	f432f642-7ae8-4661-83a4-f38471ba43de	Shankar Gadekekar	shankar@gmail.com	+919000000001	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-26 09:33:14.70509+00	0	2500000	PLACED	2026-04-18 02:01:27.287982+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
9ccdfa2a-c35d-46d2-a4a4-21473f5c7603	SPF00065	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Javed	javed@gmail.com	+918459875692	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:44:31.984963+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
0a58ed3f-e5b0-45fe-8644-ef7c9ef2c635	SPF00078	b95015cf-9563-416e-b9a2-1c5391daa923	DURGA PARWATKAR	durgaparwatkar1@gmail.com	+91 90229 55375	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:22:09.304414+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
6d70a8dd-a402-46c3-9d30-28eee39273e1	SPF00107	efd24093-d64e-4ebd-82c0-77c5c820fb3f	faizan-02test	faizanvector@gmail.com	+918600000889	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-04 08:36:39.37154+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
7cf96627-8a21-4f29-bdfd-521ed3a19cdb	SPF00006	6f4c6872-e632-4d0d-9641-46cc3cb499c8	Left-Leg Core Account	left-leg-core@spf.com	+919222222222	12345678	INACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-20 13:56:29.426839+00	0	0	PLACED	2026-04-20 13:02:39.230801+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
f432f642-7ae8-4661-83a4-f38471ba43de	SPF00008	23495a8d-1e44-4ec0-b803-4d61879b332f	Left Leg Division Account 2	left-leg-division-2@spf.com	+919555555555	12345678	INACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-20 19:19:29.689723+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
01907889-f3da-44a3-8018-e80a63d45e8f	SPF00011	fca2b6d8-e405-4838-b85f-80919fe0c362	Chanda Shinde	chanda.shinde@gmail.com	+919000000003	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-18 02:16:57.447125+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
525a24fb-eba0-4e99-90a8-3f83ea21e242	SPF00102	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	sajid ansari	ansarisajid592@gmail.com	+919270000372	securemart	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-02 09:43:05.808296+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	\N	\N
06685f0a-7a3e-4231-b939-50160cdff79f	SPF00022	628a78b1-7366-4126-bc29-37809192668b	Sagar Gopalrao Bagade	mr.sagarbagade@gmail.com	+919921246724	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 04:52:26.445408+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
3e094f9e-3cfe-41b1-beac-81cdc9e09837	SPF00106	efd24093-d64e-4ebd-82c0-77c5c820fb3f	testpackage	faizanembedded@gmail.com	+917887868492	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-05-03 09:24:40.644028+00	0	300000	PLACED	2026-05-03 09:19:19.266491+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	390000	202605	0	\N	\N	\N	\N	\N	\N	\N
23495a8d-1e44-4ec0-b803-4d61879b332f	SPF00007	7cf96627-8a21-4f29-bdfd-521ed3a19cdb	Left Leg Division Account 1	left-leg-divison-1@gmail.com	+919444444444	12345678	INACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-20 19:17:17.366316+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
37e43ad5-2b26-4da9-b62a-5caac371d505	SPF00016	fca2b6d8-e405-4838-b85f-80919fe0c362	Kashmir Meshram	kashmir.meshram@gmail.com	+919000000009	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-18 07:36:38.354272+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
f8405811-9d0d-4389-91ed-228c2b53d085	SPF00096	1abd0533-b176-4629-8021-7714628436e1	Sachin R Bhoyar	sachinbhoyar513@gmail.com	+919049675366	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-25 09:34:45.53845+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
16eeae3a-8c8b-4be3-a046-49a768d72b0b	SPF00014	fca2b6d8-e405-4838-b85f-80919fe0c362	Atul Dhanulkar	atul.dhanulkar@gmail.com	+919000000007	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-18 07:36:38.354272+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
152c681f-d75f-47d3-8d65-3d31523d97d8	SPF00079	b95015cf-9563-416e-b9a2-1c5391daa923	Pushpak Parwatkar	pushpakparwatkar@gmail.com	5484649494646	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:23:03.728592+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
2eceebd3-eedf-46b0-bd94-edb9111debb7	SPF00113	efd24093-d64e-4ebd-82c0-77c5c820fb3f	ali	truelink.ai@gmail.com	+917666009723	111222333	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-05-09 19:23:47.843694+00	0	300000	PLACED	2026-05-09 08:22:04.433259+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	381329	202605	0	\N	\N	\N	\N	\N	\N	\N
c869adb1-5489-495e-a570-d68ba4263afc	SPF00093	486554b1-2b13-4378-9e53-fa8cfeed79c4	Gariba Dama Gudimeshram	gdmeshram66@gmail.com	+919823030144	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-25 07:47:14.761485+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
203d321b-d01d-45fa-9961-75eebc985f92	SPF00028	16eeae3a-8c8b-4be3-a046-49a768d72b0b	Anand M	healysachin@gmail.com	+919881155361	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:15:39.278585+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
510221a0-262d-4521-b3c5-202b205e4bab	SPF00031	69fa2d9f-a41b-443e-a8df-2a90e69bef08	RUCHI GADPAYLE	ruchigadpayle@gmail.com	+918468875261	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:23:23.018654+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
cc1f69ca-d0fd-4c9e-b11d-f4c4f0c7c5a8	SPF00039	80aabf4a-dc17-49fb-8872-c3f22d258aef	Malti Mahadeo Rahate	rahate261164@gmail.com	+919922332411	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:40:34.41891+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
fa061211-7e53-4cee-910a-b67ccea17902	SPF00042	0f27ca84-3038-4396-887d-c7b9624943c3	Anushka Anirudha Wawge	wawgeanushka@gmail.com	+917798073717	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 08:55:47.096949+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
1fbda134-030f-414a-a68e-3ee4600712bd	SPF00045	76bbea29-111c-4442-ae0a-a3609108dafb	Vidya Dinesh Wawge	vidyawawge3@gmail.com	+917020044970	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 09:41:03.861635+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
017c9495-6ed8-4107-a590-60e31da1bb63	SPF00048	a6bb75ca-6c40-4f43-8548-d5cdfb425f9b	Manoj Wasudeo Chopde	manojchopde00@gmail.com	+919921129838	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 10:11:14.708721+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
38bafbe2-873f-420c-916a-bd729660a76b	SPF00097	efd24093-d64e-4ebd-82c0-77c5c820fb3f			\N	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-05-03 03:35:21.205789+00	0	2500000	PLACED	2026-04-27 01:16:15.476451+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	43873	1767874	202605	0	\N	\N	\N	\N	\N	\N	\N
edcf14cf-4709-46b0-b20f-118855b44c41	SPF00066	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Aslam	aslam@gmail.com	+919865231452	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:45:57.380347+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
7f3e3ef0-c120-4e47-b348-9e6839336a57	SPF00019	c2a57bf6-388d-4e60-bdd2-506e87b5f14f	Tanvi Akash Bagade	aroundtheworldunique@gmail.com	+919370577066	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 04:41:43.134531+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
47241e8a-4bf2-4798-8342-803e56abcea8	SPF00100	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Bushra Pathan	bushrap600@gmail.com	+918698005917	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-30 10:43:51.115337+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
e46dc861-e0db-4261-af4e-671985abea7d	SPF00023	566d2c7b-ed80-479d-8510-8768757158f1	Vijay Gopinath Sutawane	vijaysutawane9@gmail.com	+918788376160	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:01:51.297824+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
628a78b1-7366-4126-bc29-37809192668b	SPF00021	7f3e3ef0-c120-4e47-b348-9e6839336a57	Sunanda Gopal Bagade	mrssunandabagade@gmail.com	+919921964626	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 04:48:06.506863+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
23a432a4-f7a1-4f5e-9e30-0444d6bdca03	SPF00087	2ce7f55c-a219-42ff-be28-1cb9d9131cbd	LAXMICHAND MALLANI	lakhanmallani@gmail.com	+919325685544	LAKHAN11	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-22 04:13:57.304894+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
3b924ad9-a0d6-41f1-a0f5-31af802c9daf	SPF00043	16eeae3a-8c8b-4be3-a046-49a768d72b0b	Rajani Dhanulkar	rajani.satpute@gmail.com	+917219799999	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 09:27:08.823773+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
eea46fd3-1cfa-47d2-bfdf-1a83683b7db4	SPF00055	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	Tahmeed Khan	tahmeedkhan6786@gmail.com	+91 87886 46711	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:21:10.67732+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
90065828-1126-45ae-a2b4-125ba6919b50	SPF00026	16eeae3a-8c8b-4be3-a046-49a768d72b0b	Manish	tagic82@gmail.com	+919881155229	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:13:06.182438+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
6f4c6872-e632-4d0d-9641-46cc3cb499c8	SPF00005	29a80af3-0b11-4673-908e-7d0689593d2c	Left-Leg Management Account	left-leg-management@spf.com	+919111111111	12345678	INACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-20 13:56:29.426839+00	0	0	PLACED	2026-04-20 13:00:15.591793+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
d8029db4-097b-4562-b074-8806f6918392	SPF00060	19169d69-818e-4dab-99c9-e55f34bc04e7	Talha Sajjad sheikh	talhasajjadsheikh13@gmail.com	+918149935840	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 13:37:10.160705+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
a4a5f931-5018-4b2d-aa47-0290853c2280	SPF00029	16eeae3a-8c8b-4be3-a046-49a768d72b0b	Mihir M	iteracare700@gmail.com	+919922933116	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:18:46.174951+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
971e68d8-05d9-4eef-8242-d67886e454b2	SPF00032	e46dc861-e0db-4261-af4e-671985abea7d	Anand Madanrao Shinde	aavs15582@gmail.com	+919881981826	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:25:44.337517+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
f265ce24-1bdc-4bb4-a455-a19efb3c030b	SPF00034	69fa2d9f-a41b-443e-a8df-2a90e69bef08	AYUSH GADPAYLE	ayushgadpayle1@gmail.com	+919689223929	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:30:47.495233+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
40b96e2f-c6f0-4a50-99b5-d64acde7077b	SPF00036	b95015cf-9563-416e-b9a2-1c5391daa923	DIPAK PARWATKAR	dipakparwatkar@gmail.com	+918007165569	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:33:53.79114+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
0f27ca84-3038-4396-887d-c7b9624943c3	SPF00037	f6730f2b-459d-4e31-b7d2-1c6eeca90ebe	Yash Anirudha Wawge	mdwawge@gmail.com	+919822911669	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:35:36.810182+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
b2d76696-c206-4c6b-bf0d-b0c2432cd8d3	SPF00040	0f27ca84-3038-4396-887d-c7b9624943c3	Ananta Dnyaneshwar Wawge	anantawawgew@gmail.com	+919011892889	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 05:45:29.340729+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
3832450e-3f30-4cdf-9010-18a66b6c9979	SPF00074	fb4b360e-ac02-40b0-b86c-89d08ab10d10	Nisha thaware	nishathavre74@gmail.com	+91 70664 37039	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:06:41.784487+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
0f399427-88c2-49c2-a429-6e2ce5a5a5a4	SPF00075	b95015cf-9563-416e-b9a2-1c5391daa923	LIYA PARWATKAR	liyaparwatkar12@gmail.com	98765432111	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:18:17.429406+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
0932abe8-ef98-4e6e-a1ea-2516f6bde4dc	SPF00076	b95015cf-9563-416e-b9a2-1c5391daa923	DURGA PARWATKAR	durgaparwatkar@gmail.com	+919673173175	12345678	INACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-04-21 14:20:10.101321+00	2026-05-16 00:01:00.011665+00	\N	\N	\N	\N	\N	\N	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
efd24093-d64e-4ebd-82c0-77c5c820fb3f	SPF00018	fca2b6d8-e405-4838-b85f-80919fe0c362	faizan ansari	akramqwerty@gmail.com	+918600000889	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-24 06:06:35.159487+00	0	2500000	PLACED	2026-04-18 10:03:57.047538+00	2026-05-25 11:36:56.07441+00	fmcg-binary/avatars/efd24093-d64e-4ebd-82c0-77c5c820fb3f/6037493d-827f-4846-a50d-b92d8ac63919_Screenshot 2026-05-18 121121.png	\N	\N	\N	61178	123123	343052	120482	202605	0	\N	\N	\N	\N	\N	CTO(TESTING)	networker/title-badges/efd24093-d64e-4ebd-82c0-77c5c820fb3f/37362f1a-ec24-4659-b544-00d1aecd2cab_Screenshot 2026-05-18 121141.png
a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0	SPF00126	\N	junaid	junaid@gmail.com	\N	12345678	ACTIVE	SUB_ADMIN	\N	\N	0	0	PLACED	2026-05-19 06:04:35.714174+00	2026-05-19 11:48:23.987167+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	00000000-0000-0000-0000-000000000001	2026-05-20 11:45:32.44527+00	123456	\N	\N
2fe361c7-90ac-4586-b007-fdffdd77a9b8	SPF00127	\N	zishan	zishan@gmail.com	\N	12345678	ACTIVE	SUB_ADMIN	\N	\N	0	0	PLACED	2026-05-19 08:32:18.265666+00	2026-05-20 11:26:09.002707+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	00000000-0000-0000-0000-000000000001	2026-05-20 11:53:21.869269+00	123456	\N	\N
8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	SPF00001	00000000-0000-0000-0000-000000000001	Sheikh Bilal	bilal.sheikh123456@gmail.com	+918421371818	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111103	2026-04-18 07:51:53.888602+00	0	0	PLACED	2026-04-18 01:48:16.443305+00	2026-05-23 11:29:07.405503+00	networker/avatars/8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a/0d77431a-47f5-4981-a7a9-e180f0af8776_iPhone 14 Pro Gold On Hand Mockup HD PNG.jpg.jpeg	\N	\N	W-D55XSTVUB	9741068	\N	13958	258932	202605	0	W-D55XSTVUB	2026-05-11 12:28:57.74319+00	\N	\N	\N	\N	\N
b95015cf-9563-416e-b9a2-1c5391daa923	SPF00010	fca2b6d8-e405-4838-b85f-80919fe0c362	Rahul Parwatkar	rahulparwatkar1983@gmail.com	+918605099465	12345678	ACTIVE	NETWORKER	a1111111-1111-1111-1111-111111111101	2026-04-20 19:28:21.829498+00	0	0	PLACED	2026-04-18 02:12:08.674355+00	2026-05-19 10:07:57.741027+00	fmcg-binary/avatars/b95015cf-9563-416e-b9a2-1c5391daa923/73fe3852-5a07-4561-8a8c-a894107ef95b_1001151031.jpg	\N	\N	\N	\N	$2a$10$lpDUFEWzrDEKL4n64yW0m.tvgBHL3DPjf8tY..W4lRXqLczy7XEhi	0	0	202604	0	\N	\N	\N	\N	\N	\N	\N
8dc57588-4f0f-4313-99bd-0605425f0ec5	SPF00121	efd24093-d64e-4ebd-82c0-77c5c820fb3f	moin	m98925415@gmail.com	+919404978460	12345678	ACTIVE	NETWORKER	\N	\N	0	0	PLACED	2026-05-16 08:31:56.988426+00	2026-05-25 08:10:59.750786+00	\N	\N	\N	\N	\N	\N	0	0	202605	0	\N	\N	\N	\N	\N	CEO	networker/title-badges/8dc57588-4f0f-4313-99bd-0605425f0ec5/cc27157d-e78e-47c8-af86-7190bb17a03e_Screenshot 2026-05-18 121141.png
\.


--
-- Data for Name: p2p_transfers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.p2p_transfers (transfer_id, sender_user_id, receiver_user_id, sender_sponsor_id, receiver_sponsor_id, wallet_type, amount, service_charge, net_amount, note, debit_ledger_id, credit_ledger_id, created_at) FROM stdin;
\.


--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.packages (package_id, name, amount, daily_binary_cap, status, sort_order, created_at, updated_at) FROM stdin;
a1111111-1111-1111-1111-111111111102	Gold	750000	1000000	ACTIVE	2	2026-04-18 00:27:07.231552+00	2026-04-20 16:03:31.554049+00
a1111111-1111-1111-1111-111111111103	Platinum	1500000	2500000	ACTIVE	3	2026-04-18 00:27:07.231552+00	2026-04-20 16:03:31.554049+00
a1111111-1111-1111-1111-111111111101	Silver	260000	300000	ACTIVE	1	2026-04-18 00:27:07.231552+00	2026-05-19 12:23:20.582505+00
\.


--
-- Data for Name: pair_match_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pair_match_log (id, user_id, left_bv_matched, right_bv_matched, matched_bv, carry_forward_bv, carry_forward_leg, commission_amount, level_bonus_amount, total_credited, cap_deducted, order_reference, created_at) FROM stdin;
1	fca2b6d8-e405-4838-b85f-80919fe0c362	252386	252386	252386	417589	LEFT	25238	0	25238	0	3e50bc13-457e-477b-8b53-27b32879441f	2026-04-22 12:36:30.798864+00
2	fca2b6d8-e405-4838-b85f-80919fe0c362	417589	417589	417589	1262411	RIGHT	41758	0	41758	0	181632e0-255b-4c0b-bf5f-299716652b81	2026-04-24 06:06:36.093512+00
3	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	120000	120000	120000	2987132	LEFT	12000	1920	13920	0	34581300-7639-49ec-a233-ece7e9a3e006	2026-04-30 11:00:04.918614+00
4	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	300000	300000	300000	2687132	LEFT	30000	4800	34800	0	1cb1410a-a7a7-480c-9772-c68957d36496	2026-04-30 11:00:17.44612+00
5	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	30000	30000	30000	2657132	LEFT	3000	420	3420	0	762a759a-28c9-4772-9a24-1adfa98280f7	2026-05-02 12:15:53.106089+00
6	fac8f692-bba7-442d-9411-16a06d0e83f1	34900	34900	34900	415100	LEFT	3490	523	4013	0	368400c2-4c41-412b-ae19-a20f74120c3c	2026-05-05 08:38:13.877134+00
7	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	34900	34900	34900	4780106	LEFT	3490	558	4048	0	368400c2-4c41-412b-ae19-a20f74120c3c	2026-05-05 08:38:14.100138+00
8	38bafbe2-873f-420c-916a-bd729660a76b	381329	381329	381329	8671	LEFT	38132	4766	42898	0	c6e2ca8c-6fe3-4542-8002-0da1d04d2c5b	2026-05-09 19:23:48.042432+00
9	38bafbe2-873f-420c-916a-bd729660a76b	8671	8671	8671	882695	RIGHT	867	108	975	0	479fd902-4186-4f51-822f-4bdcfbf56987	2026-05-09 20:43:17.974496+00
\.


--
-- Data for Name: path_rank_slabs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.path_rank_slabs (rank_level, name, min_direct_bv_paise, min_lifetime_pairs, is_active, updated_at) FROM stdin;
1	Starter	0	0	t	2026-05-18 05:54:02.29162+00
2	Bronze	5000000	0	t	2026-05-18 05:54:02.29162+00
3	Silver	20000000	0	t	2026-05-18 05:54:02.29162+00
4	Gold	75000000	0	t	2026-05-18 05:54:02.29162+00
5	Platinum	250000000	0	t	2026-05-18 05:54:02.29162+00
6	Diamond	1000000000	0	t	2026-05-18 05:54:02.29162+00
\.


--
-- Data for Name: payout_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payout_config (id, config_key, config_value, updated_at) FROM stdin;
1	allowed_dates	{"value": [5, 15, 25]}	2026-04-18 00:27:05.699968+00
3	min_withdrawal_amount	{"value": 50000}	2026-04-18 00:27:05.699968+00
4	withdrawal_ist_start_hour	{"value": 10}	2026-04-18 00:27:05.886657+00
5	withdrawal_ist_end_hour	{"value": 17}	2026-04-18 00:27:05.886657+00
6	withdrawal_service_charge_percent	{"value": 0.5}	2026-04-18 00:27:05.886657+00
7	withdrawal_tds_percent	{"value": 1.0}	2026-04-18 00:27:05.886657+00
9	withdrawal_allowed_dates_team	{"value": [10, 20, 30]}	2026-04-18 00:27:05.886657+00
10	withdrawal_max_percent_of_monthly_income	{"value": 100}	2026-04-18 00:27:05.886657+00
2	max_percent_of_monthly_income	{"value": 100}	2026-05-15 12:25:12.979879+00
8	withdrawal_allowed_dates_direct	{"value": [10, 20, 30]}	2026-05-19 11:49:02.390021+00
\.


--
-- Data for Name: payout_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payout_requests (payout_id, user_id, wallet_type, requested_amount, service_charge_paise, tds_paise, net_payout_paise, payment_method, approved_amount, status, admin_id, admin_note, sc_tx_reference, sc_user_email, requested_at, processed_at) FROM stdin;
596ed308-1016-4106-82c3-8ed919a77ed4	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	50000	250	500	49250	SECURE_WALLET	\N	FAILED	00000000-0000-0000-0000-000000000001	SC API failed: secure-coin client not configured	\N	akramqwerty@gmail.com	2026-05-19 07:06:51.501661+00	2026-05-19 07:53:05.130539+00
a2f1cec8-be8e-4eff-8ebc-774dcb2d51db	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	60000	300	600	59100	SECURE_WALLET	\N	FAILED	00000000-0000-0000-0000-000000000001	SC API failed: secure-coin client not configured	\N	akramqwerty@gmail.com	2026-05-19 07:54:32.542049+00	2026-05-19 07:55:33.306031+00
\.


--
-- Data for Name: pending_bv_hold; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pending_bv_hold (id, source_user_id, order_reference, bv_amount, status, created_at, released_at) FROM stdin;
1	b95015cf-9563-416e-b9a2-1c5391daa923	653b65fb-049c-434f-860f-41b25cb69657	263319	HELD	2026-04-18 02:25:51.615818+00	\N
2	38bafbe2-873f-420c-916a-bd729660a76b	bb3fb6dd-8068-4c10-affc-7988ae82dc79	504771	RELEASED	2026-04-27 01:19:28.507158+00	2026-04-29 01:16:40.590661+00
3	0da59fa2-94c9-496b-a866-8d3bf43605f2	34581300-7639-49ec-a233-ece7e9a3e006	120000	RELEASED	2026-04-30 10:18:27.822057+00	2026-04-30 11:00:08.285797+00
4	0da59fa2-94c9-496b-a866-8d3bf43605f2	1cb1410a-a7a7-480c-9772-c68957d36496	300000	RELEASED	2026-04-30 10:24:08.017281+00	2026-04-30 11:00:17.659348+00
5	65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	368400c2-4c41-412b-ae19-a20f74120c3c	34900	RELEASED	2026-05-03 08:42:50.672611+00	2026-05-05 08:38:14.136006+00
6	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	5a36f4df-98a7-421b-bc19-de6d6bbd369e	1909429	RELEASED	2026-05-09 21:03:57.871805+00	2026-05-09 21:13:58.962395+00
\.


--
-- Data for Name: placement_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.placement_requests (id, user_id, sponsor_user_id, status, decided_leg, decided_by, expires_at, decided_at, created_at) FROM stdin;
83eb7a0e-eb51-45fe-a988-e141a7720a03	2df522bd-313c-471f-8fa4-bdee5baa7503	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	AUTO_PLACED	RIGHT	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-04-23 18:05:07.885398+00	2026-04-23 18:05:35.840983+00	2026-04-21 18:05:07.912481+00
aaad9d20-d10f-41da-ae71-80f0f5ba3a8b	38bafbe2-873f-420c-916a-bd729660a76b	efd24093-d64e-4ebd-82c0-77c5c820fb3f	AUTO_PLACED	LEFT	efd24093-d64e-4ebd-82c0-77c5c820fb3f	2026-04-29 01:16:15.692399+00	2026-04-29 01:16:40.478605+00	2026-04-27 01:16:15.722585+00
72aaacd9-88ca-4fb1-9b39-82c0e007d6c0	0da59fa2-94c9-496b-a866-8d3bf43605f2	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	AUTO_PLACED	RIGHT	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-04-30 10:59:43.28275+00	2026-04-30 10:59:59.288963+00	2026-04-28 10:59:43.270898+00
5888e3ec-b8ac-4f9a-b4b3-b24f5905fd72	47241e8a-4bf2-4798-8342-803e56abcea8	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	AUTO_PLACED	RIGHT	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-05-02 10:43:51.34615+00	2026-05-02 10:44:20.402846+00	2026-04-30 10:43:51.38702+00
de2cbb92-dad9-434f-a700-6b47793eacd8	c68bd25b-8da6-4d2b-935f-b099cc0aa37f	efd24093-d64e-4ebd-82c0-77c5c820fb3f	AUTO_PLACED	RIGHT	efd24093-d64e-4ebd-82c0-77c5c820fb3f	2026-05-03 01:32:42.906717+00	2026-05-03 01:33:24.664623+00	2026-05-01 01:32:42.906729+00
26970a62-bfc1-4aa5-bd91-6952a44db973	525a24fb-eba0-4e99-90a8-3f83ea21e242	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	AUTO_PLACED	RIGHT	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-05-04 09:43:05.888294+00	2026-05-04 09:43:21.771076+00	2026-05-02 09:43:05.87122+00
94c866c6-6692-43ea-a91c-7939ee14a312	74a10a58-62b0-4845-ae1b-fb401cfe330b	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	AUTO_PLACED	RIGHT	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-05-05 02:40:06.968805+00	2026-05-05 02:40:13.058105+00	2026-05-03 02:40:06.952033+00
910660eb-254a-4409-b381-486e668dc3b0	65ea6ae9-dcc8-47f8-a8f1-20ee3f49be41	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	AUTO_PLACED	RIGHT	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-05-05 08:37:58.87467+00	2026-05-05 08:38:12.712163+00	2026-05-03 08:37:58.874982+00
89e6e578-12a0-4514-b9e6-4684d9a09835	2eceebd3-eedf-46b0-bd94-edb9111debb7	efd24093-d64e-4ebd-82c0-77c5c820fb3f	APPROVED	LEFT	efd24093-d64e-4ebd-82c0-77c5c820fb3f	2026-05-11 08:22:04.516213+00	2026-05-09 11:27:04.214223+00	2026-05-09 08:22:04.520091+00
cbcc574f-38b8-4c33-b5ca-4e66ef77e88a	b6f878e7-ed5d-4337-a253-7a6e46f947ae	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	ADMIN_PLACED	LEFT	00000000-0000-0000-0000-000000000001	2026-05-10 11:24:50.420988+00	2026-05-09 12:22:32.445282+00	2026-05-08 11:24:50.421214+00
079c9817-9897-43a4-bffe-27817fcdd0ce	e4dab429-54f0-420f-b794-6c5e23855ea5	efd24093-d64e-4ebd-82c0-77c5c820fb3f	APPROVED	LEFT	efd24093-d64e-4ebd-82c0-77c5c820fb3f	2026-05-11 20:04:58.396884+00	2026-05-09 20:31:01.933861+00	2026-05-09 20:04:58.397267+00
8db65a35-f7dd-44fd-8af8-975b78aec3c1	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	e4dab429-54f0-420f-b794-6c5e23855ea5	APPROVED	LEFT	e4dab429-54f0-420f-b794-6c5e23855ea5	2026-05-11 20:54:41.012601+00	2026-05-09 21:13:58.87926+00	2026-05-09 20:54:41.013251+00
56321b6e-fb73-4f87-9653-dcfde6fe0afc	b5c04e4c-a400-49e6-bc3a-abe94f0994f4	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	AUTO_PLACED	RIGHT	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-05-10 10:35:47.50941+00	2026-05-10 10:36:26.438712+00	2026-05-08 10:35:47.51045+00
a706d54e-8e1e-4bca-b370-ac001e4aa6a3	a6270686-aa0f-4e9b-a4e1-63019c4cad90	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	AUTO_PLACED	RIGHT	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	2026-05-10 16:37:46.240597+00	2026-05-10 16:38:30.700483+00	2026-05-08 16:37:46.241623+00
\.


--
-- Data for Name: support_pre_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.support_pre_questions (id, question, category, sort_order, is_active, created_at, updated_at) FROM stdin;
1	hello(topic-1-testing)	local-test	2	t	2026-05-20 11:15:12.094904+00	2026-05-20 11:16:21.982627+00
2	hello(topic-2-testing)	local-test-2	1	t	2026-05-20 11:15:53.670257+00	2026-05-20 11:23:22.763032+00
\.


--
-- Data for Name: support_ticket_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.support_ticket_messages (id, ticket_id, sender_type, sender_user_id, message_text, attachment_urls, created_at) FROM stdin;
1	9a29069a-a719-4bc0-b353-fbab62937a32	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	hello testing first ticket\nhello testing first ticket	[]	2026-05-20 10:27:33.480026+00
2	9a29069a-a719-4bc0-b353-fbab62937a32	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	kitne paise	[]	2026-05-20 10:28:59.336354+00
3	9a29069a-a719-4bc0-b353-fbab62937a32	admin	00000000-0000-0000-0000-000000000001	100 rs	[]	2026-05-20 10:30:11.602957+00
4	9a29069a-a719-4bc0-b353-fbab62937a32	system	00000000-0000-0000-0000-000000000001	Ticket assigned	[]	2026-05-20 10:30:22.364457+00
5	9a29069a-a719-4bc0-b353-fbab62937a32	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	kyu itna	[]	2026-05-20 10:30:56.704115+00
6	9a29069a-a719-4bc0-b353-fbab62937a32	admin	00000000-0000-0000-0000-000000000001	tune shanpane kiya to 900 karduga	[]	2026-05-20 10:31:53.993542+00
7	9a29069a-a719-4bc0-b353-fbab62937a32	system	efd24093-d64e-4ebd-82c0-77c5c820fb3f	Ticket closed by user	[]	2026-05-20 10:50:19.668057+00
8	b67622bd-15d7-424f-b9f9-71b0c5126ec8	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	maine dekh wo ladak gumra tha google map pe	[]	2026-05-20 10:53:26.56283+00
9	b67622bd-15d7-424f-b9f9-71b0c5126ec8	system	00000000-0000-0000-0000-000000000001	Ticket assigned	[]	2026-05-20 11:09:17.434921+00
10	b67622bd-15d7-424f-b9f9-71b0c5126ec8	admin	00000000-0000-0000-0000-000000000001	hello	[]	2026-05-20 11:12:37.65888+00
11	b67622bd-15d7-424f-b9f9-71b0c5126ec8	system	00000000-0000-0000-0000-000000000001	Ticket closed by admin	[]	2026-05-20 11:13:30.477299+00
12	9335ba5e-8ea8-472e-b74f-9acd3a7300a2	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	hello-testing-for-sub-admin\nhello-testing-for-sub-admin	[]	2026-05-20 11:25:24.546031+00
13	9335ba5e-8ea8-472e-b74f-9acd3a7300a2	system	00000000-0000-0000-0000-000000000001	Ticket reassigned	[]	2026-05-20 11:26:24.562879+00
14	0d9d920e-6148-444f-b62f-158769b87eca	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	hello world	[]	2026-05-20 11:41:24.327159+00
15	0d9d920e-6148-444f-b62f-158769b87eca	system	2fe361c7-90ac-4586-b007-fdffdd77a9b8	Ticket assigned	[]	2026-05-20 11:42:07.41885+00
16	0d9d920e-6148-444f-b62f-158769b87eca	admin	2fe361c7-90ac-4586-b007-fdffdd77a9b8	kaha ho	[]	2026-05-20 11:42:18.590051+00
17	91b2af8e-6ef2-47d0-9493-81145ded996d	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	testing-sub-admin-3\ntesting-sub-admin-3	[]	2026-05-20 11:45:59.212341+00
18	91b2af8e-6ef2-47d0-9493-81145ded996d	system	2fe361c7-90ac-4586-b007-fdffdd77a9b8	Ticket assigned	[]	2026-05-20 11:53:29.398184+00
19	91b2af8e-6ef2-47d0-9493-81145ded996d	admin	2fe361c7-90ac-4586-b007-fdffdd77a9b8	kaise ho	[]	2026-05-20 11:53:34.180639+00
20	97b8e679-11dc-49b0-a892-58b72f512ef0	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	world	[]	2026-05-20 12:51:01.376755+00
21	97b8e679-11dc-49b0-a892-58b72f512ef0	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	\N	[{"url": "networker/support-tickets/97b8e679-11dc-49b0-a892-58b72f512ef0/00787643-a34f-4d10-a1f2-89483d60adbe-Screenshot_2026-05-18_121141.png", "type": "image/png", "filename": "Screenshot 2026-05-18 121141.png"}]	2026-05-20 13:06:44.775439+00
22	97b8e679-11dc-49b0-a892-58b72f512ef0	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	\N	[{"url": "networker/support-tickets/97b8e679-11dc-49b0-a892-58b72f512ef0/4b35184b-d90d-482b-9e4d-d8086ecc18b2-Screenshot_2026-05-19_132843.png", "type": "image/png", "filename": "Screenshot 2026-05-19 132843.png"}]	2026-05-20 13:09:06.982991+00
23	97b8e679-11dc-49b0-a892-58b72f512ef0	user	efd24093-d64e-4ebd-82c0-77c5c820fb3f	\N	[{"url": "networker/support-tickets/97b8e679-11dc-49b0-a892-58b72f512ef0/57291a69-7593-4709-898d-c412e3cbad15-Screenshot_2026-05-18_112536.png", "type": "image/png", "filename": "Screenshot 2026-05-18 112536.png"}]	2026-05-20 13:19:02.731757+00
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.support_tickets (id, user_id, pre_question_id, subject, status, assigned_to, closed_at, closed_by_user_id, last_message_at, created_at, updated_at) FROM stdin;
9a29069a-a719-4bc0-b353-fbab62937a32	efd24093-d64e-4ebd-82c0-77c5c820fb3f	\N	hello testing first ticket	closed	00000000-0000-0000-0000-000000000001	2026-05-20 10:50:19.660101+00	efd24093-d64e-4ebd-82c0-77c5c820fb3f	2026-05-20 10:50:19.672217+00	2026-05-20 10:27:33.465294+00	2026-05-20 10:50:19.672217+00
b67622bd-15d7-424f-b9f9-71b0c5126ec8	efd24093-d64e-4ebd-82c0-77c5c820fb3f	\N	zishan sahi se kam nahi karra (testing)	closed	00000000-0000-0000-0000-000000000001	2026-05-20 11:13:30.464169+00	00000000-0000-0000-0000-000000000001	2026-05-20 11:13:30.482719+00	2026-05-20 10:53:26.55699+00	2026-05-20 11:13:30.482719+00
9335ba5e-8ea8-472e-b74f-9acd3a7300a2	efd24093-d64e-4ebd-82c0-77c5c820fb3f	1	hello-testing-for-sub-admin	in_progress	2fe361c7-90ac-4586-b007-fdffdd77a9b8	\N	\N	2026-05-20 11:26:24.570297+00	2026-05-20 11:25:24.495042+00	2026-05-20 11:26:24.570297+00
0d9d920e-6148-444f-b62f-158769b87eca	efd24093-d64e-4ebd-82c0-77c5c820fb3f	\N	sub-admin-testing-2	in_progress	2fe361c7-90ac-4586-b007-fdffdd77a9b8	\N	\N	2026-05-20 11:42:18.626849+00	2026-05-20 11:41:24.306611+00	2026-05-20 11:42:18.626849+00
91b2af8e-6ef2-47d0-9493-81145ded996d	efd24093-d64e-4ebd-82c0-77c5c820fb3f	\N	testing-sub-admin-3	in_progress	2fe361c7-90ac-4586-b007-fdffdd77a9b8	\N	\N	2026-05-20 11:53:34.186355+00	2026-05-20 11:45:59.201208+00	2026-05-20 11:53:34.186355+00
97b8e679-11dc-49b0-a892-58b72f512ef0	efd24093-d64e-4ebd-82c0-77c5c820fb3f	\N	hello	open	\N	\N	\N	2026-05-20 13:19:02.76578+00	2026-05-20 12:51:01.362162+00	2026-05-20 13:19:02.76578+00
\.


--
-- Data for Name: user_packages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_packages (id, user_id, package_id, amount_paid, activated_at, expired_at, status, created_at) FROM stdin;
5	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	a1111111-1111-1111-1111-111111111103	1500000	2026-04-18 07:51:53.888602+00	\N	ACTIVE	2026-04-18 07:51:53.888602+00
6	fca2b6d8-e405-4838-b85f-80919fe0c362	a1111111-1111-1111-1111-111111111103	1500000	2026-04-18 07:51:53.888602+00	\N	ACTIVE	2026-04-18 07:51:53.888602+00
7	fac8f692-bba7-442d-9411-16a06d0e83f1	a1111111-1111-1111-1111-111111111103	1500000	2026-04-18 07:51:53.888602+00	\N	ACTIVE	2026-04-18 07:51:53.888602+00
8	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	a1111111-1111-1111-1111-111111111101	378579	2026-04-18 09:32:07.919736+00	\N	ACTIVE	2026-04-18 09:32:07.919736+00
11	29a80af3-0b11-4673-908e-7d0689593d2c	a1111111-1111-1111-1111-111111111103	1500000	2026-04-20 13:56:29.426839+00	\N	ACTIVE	2026-04-20 13:56:29.426839+00
12	6f4c6872-e632-4d0d-9641-46cc3cb499c8	a1111111-1111-1111-1111-111111111103	1500000	2026-04-20 13:56:29.426839+00	\N	ACTIVE	2026-04-20 13:56:29.426839+00
13	7cf96627-8a21-4f29-bdfd-521ed3a19cdb	a1111111-1111-1111-1111-111111111103	1500000	2026-04-20 13:56:29.426839+00	\N	ACTIVE	2026-04-20 13:56:29.426839+00
10	6843c544-e6bd-4589-80b7-9bf2da336422	a1111111-1111-1111-1111-111111111101	378579	2026-04-18 11:33:23.308145+00	\N	EXPIRED	2026-04-18 11:33:23.308145+00
25	23495a8d-1e44-4ec0-b803-4d61879b332f	a1111111-1111-1111-1111-111111111103	1500000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
26	f432f642-7ae8-4661-83a4-f38471ba43de	a1111111-1111-1111-1111-111111111103	1500000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
28	b95015cf-9563-416e-b9a2-1c5391daa923	a1111111-1111-1111-1111-111111111101	250000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
29	01907889-f3da-44a3-8018-e80a63d45e8f	a1111111-1111-1111-1111-111111111101	250000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
30	69fa2d9f-a41b-443e-a8df-2a90e69bef08	a1111111-1111-1111-1111-111111111101	250000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
31	22a3e85d-a774-4aa1-81e5-e14660cbd730	a1111111-1111-1111-1111-111111111101	250000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
32	a7394bca-0cce-40e5-bd33-8865c446be30	a1111111-1111-1111-1111-111111111101	250000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
33	16eeae3a-8c8b-4be3-a046-49a768d72b0b	a1111111-1111-1111-1111-111111111101	250000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
34	c2a57bf6-388d-4e60-bdd2-506e87b5f14f	a1111111-1111-1111-1111-111111111101	250000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
35	37e43ad5-2b26-4da9-b62a-5caac371d505	a1111111-1111-1111-1111-111111111101	250000	2026-04-20 19:28:21.829498+00	\N	ACTIVE	2026-04-20 19:28:21.829498+00
9	efd24093-d64e-4ebd-82c0-77c5c820fb3f	a1111111-1111-1111-1111-111111111101	252386	2026-04-18 10:06:43.21826+00	2026-04-22 12:37:37.682032+00	RENEWED	2026-04-18 10:06:43.21826+00
36	efd24093-d64e-4ebd-82c0-77c5c820fb3f	a1111111-1111-1111-1111-111111111101	252386	2026-04-22 12:36:28.35895+00	2026-04-22 12:37:37.682032+00	RENEWED	2026-04-22 12:36:28.35895+00
37	efd24093-d64e-4ebd-82c0-77c5c820fb3f	a1111111-1111-1111-1111-111111111102	750000	2026-04-22 12:37:37.859248+00	2026-04-24 06:06:35.217835+00	RENEWED	2026-04-22 12:37:37.859248+00
38	efd24093-d64e-4ebd-82c0-77c5c820fb3f	a1111111-1111-1111-1111-111111111103	1680000	2026-04-24 06:06:35.425801+00	\N	ACTIVE	2026-04-24 06:06:35.425801+00
27	6843c544-e6bd-4589-80b7-9bf2da336422	a1111111-1111-1111-1111-111111111101	250000	2026-04-20 19:28:21.829498+00	2026-04-25 14:50:28.63054+00	RENEWED	2026-04-20 19:28:21.829498+00
39	6843c544-e6bd-4589-80b7-9bf2da336422	a1111111-1111-1111-1111-111111111102	750000	2026-04-25 14:50:28.719233+00	2026-04-26 09:33:14.673193+00	RENEWED	2026-04-25 14:50:28.719233+00
40	6843c544-e6bd-4589-80b7-9bf2da336422	a1111111-1111-1111-1111-111111111103	1500000	2026-04-26 09:33:14.697554+00	\N	ACTIVE	2026-04-26 09:33:14.697554+00
42	0da59fa2-94c9-496b-a866-8d3bf43605f2	a1111111-1111-1111-1111-111111111101	300000	2026-04-30 10:24:06.104883+00	\N	ACTIVE	2026-04-30 10:24:06.104883+00
41	38bafbe2-873f-420c-916a-bd729660a76b	a1111111-1111-1111-1111-111111111101	504771	2026-04-27 01:19:28.192298+00	2026-05-03 03:35:21.208333+00	RENEWED	2026-04-27 01:19:28.192298+00
43	38bafbe2-873f-420c-916a-bd729660a76b	a1111111-1111-1111-1111-111111111103	1546261	2026-05-03 03:35:21.493279+00	\N	ACTIVE	2026-05-03 03:35:21.493279+00
44	3e094f9e-3cfe-41b1-beac-81cdc9e09837	a1111111-1111-1111-1111-111111111101	390000	2026-05-03 09:24:40.709645+00	\N	ACTIVE	2026-05-03 09:24:40.709645+00
45	2eceebd3-eedf-46b0-bd94-edb9111debb7	a1111111-1111-1111-1111-111111111101	381329	2026-05-09 19:23:47.86416+00	\N	ACTIVE	2026-05-09 19:23:47.86416+00
46	e4dab429-54f0-420f-b794-6c5e23855ea5	a1111111-1111-1111-1111-111111111102	891366	2026-05-09 20:43:17.868478+00	\N	ACTIVE	2026-05-09 20:43:17.868478+00
47	c7474b91-e3cb-4590-b2a9-4af0dbfe390f	a1111111-1111-1111-1111-111111111103	1909429	2026-05-09 21:03:57.84811+00	\N	ACTIVE	2026-05-09 21:03:57.84811+00
48	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	a1111111-1111-1111-1111-111111111101	258932	2026-05-10 13:57:53.241963+00	\N	ACTIVE	2026-05-10 13:57:53.241963+00
\.


--
-- Data for Name: wallet_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallet_ledger (id, user_id, wallet_type, amount, entry_type, source, reference_id, reference_type, description, created_at) FROM stdin;
2	fca2b6d8-e405-4838-b85f-80919fe0c362	DIRECT	25238	CREDIT	DIRECT_COMMISSION	e1f6537e-383d-4955-b898-7fbdc3530bf9	PURCHASE	\N	2026-04-18 10:06:43.420405+00
3	fca2b6d8-e405-4838-b85f-80919fe0c362	DIRECT	37857	CREDIT	DIRECT_COMMISSION	925e2b1a-ee54-4a4f-bb50-b5b585e50392	PURCHASE	\N	2026-04-18 11:33:23.347719+00
4	fca2b6d8-e405-4838-b85f-80919fe0c362	DIRECT	3901	CREDIT	DIRECT_COMMISSION	617b260f-a9cc-4f57-ba39-c21daf901680	PURCHASE	\N	2026-04-19 06:33:18.182145+00
5	fca2b6d8-e405-4838-b85f-80919fe0c362	DIRECT	25238	CREDIT	DIRECT_COMMISSION	3e50bc13-457e-477b-8b53-27b32879441f	PURCHASE	Direct commission from faizan ansari	2026-04-22 12:36:28.732835+00
6	fca2b6d8-e405-4838-b85f-80919fe0c362	TEAM	25238	CREDIT	BINARY_MATCH	3e50bc13-457e-477b-8b53-27b32879441f	PURCHASE	Binary commission from faizan ansari	2026-04-22 12:36:29.833394+00
7	fca2b6d8-e405-4838-b85f-80919fe0c362	DIRECT	168000	CREDIT	DIRECT_COMMISSION	181632e0-255b-4c0b-bf5f-299716652b81	PURCHASE	Direct commission from faizan ansari	2026-04-24 06:06:35.508202+00
8	fca2b6d8-e405-4838-b85f-80919fe0c362	TEAM	41758	CREDIT	BINARY_MATCH	181632e0-255b-4c0b-bf5f-299716652b81	PURCHASE	Binary commission from faizan ansari	2026-04-24 06:06:35.934668+00
9	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	50477	CREDIT	DIRECT_COMMISSION	bb3fb6dd-8068-4c10-affc-7988ae82dc79	PURCHASE	Direct commission from Aman Singh	2026-04-27 01:19:28.326612+00
10	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	DIRECT	12000	CREDIT	DIRECT_COMMISSION	34581300-7639-49ec-a233-ece7e9a3e006	PURCHASE	Direct commission from Anees shaikh	2026-04-30 10:18:27.662958+00
11	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	DIRECT	30000	CREDIT	DIRECT_COMMISSION	1cb1410a-a7a7-480c-9772-c68957d36496	PURCHASE	Direct commission from Anees shaikh	2026-04-30 10:24:07.77539+00
12	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	TEAM	12000	CREDIT	BINARY_MATCH	34581300-7639-49ec-a233-ece7e9a3e006	PURCHASE	Binary commission from Anees shaikh	2026-04-30 10:59:59.995787+00
13	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	TEAM	1920	CREDIT	LEVEL_BONUS	34581300-7639-49ec-a233-ece7e9a3e006	PURCHASE	Level 5 income from Anees shaikh	2026-04-30 11:00:00.683707+00
14	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	TEAM	30000	CREDIT	BINARY_MATCH	1cb1410a-a7a7-480c-9772-c68957d36496	PURCHASE	Binary commission from Anees shaikh	2026-04-30 11:00:15.810383+00
15	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	TEAM	4800	CREDIT	LEVEL_BONUS	1cb1410a-a7a7-480c-9772-c68957d36496	PURCHASE	Level 5 income from Anees shaikh	2026-04-30 11:00:16.702297+00
16	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	DIRECT	3000	CREDIT	DIRECT_COMMISSION	762a759a-28c9-4772-9a24-1adfa98280f7	PURCHASE	Direct commission from Faizan sheikh	2026-05-02 12:15:52.40735+00
17	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	TEAM	3000	CREDIT	BINARY_MATCH	762a759a-28c9-4772-9a24-1adfa98280f7	PURCHASE	Binary commission from Faizan sheikh	2026-05-02 12:15:52.76906+00
18	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	TEAM	420	CREDIT	LEVEL_BONUS	762a759a-28c9-4772-9a24-1adfa98280f7	PURCHASE	Level 3 income from Faizan sheikh	2026-05-02 12:15:52.912035+00
19	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	154626	CREDIT	DIRECT_COMMISSION	f623ebc5-9b1a-43af-8710-864dc5e59593	PURCHASE	Direct commission from Aman Singh	2026-05-03 03:35:21.68864+00
20	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	DIRECT	3490	CREDIT	DIRECT_COMMISSION	368400c2-4c41-412b-ae19-a20f74120c3c	PURCHASE	Direct commission from Siddhant Gour	2026-05-03 08:42:50.628147+00
21	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	39000	CREDIT	DIRECT_COMMISSION	5d68ab62-cd9e-4a1b-b55f-f076b8f2ccfd	PURCHASE	Direct commission from testpackage	2026-05-03 09:24:40.7938+00
22	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	2833	CREDIT	DIRECT_COMMISSION	4955c2ec-1b10-4e5f-b10f-2587c7ceaf4a	PURCHASE	Direct commission from Aman Singh	2026-05-03 09:44:21.153513+00
23	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	2833	CREDIT	DIRECT_COMMISSION	e7b07a12-ba23-42aa-b4b2-9f1d2ba94371	PURCHASE	Direct commission from 	2026-05-04 06:12:56.663624+00
24	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	3043	CREDIT	DIRECT_COMMISSION	a8f674ce-a01d-481c-aaaf-44598840e7ee	PURCHASE	Direct commission from 	2026-05-04 06:26:53.706034+00
25	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	3003	CREDIT	DIRECT_COMMISSION	369019e1-7510-4888-8a15-f56aa147d460	PURCHASE	Direct commission from 	2026-05-04 06:27:33.710332+00
26	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	7403	CREDIT	DIRECT_COMMISSION	14307809-7034-45d1-bb35-b4140e14bcb2	PURCHASE	Direct commission from 	2026-05-04 06:28:13.51781+00
27	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	3043	CREDIT	DIRECT_COMMISSION	7eba7e86-724f-4ce7-87dd-60fc476614a5	PURCHASE	Direct commission from 	2026-05-04 06:44:49.30205+00
28	fac8f692-bba7-442d-9411-16a06d0e83f1	TEAM	3490	CREDIT	BINARY_MATCH	368400c2-4c41-412b-ae19-a20f74120c3c	PURCHASE	Binary commission from Siddhant Gour	2026-05-05 08:38:13.517736+00
29	fac8f692-bba7-442d-9411-16a06d0e83f1	TEAM	523	CREDIT	LEVEL_BONUS	368400c2-4c41-412b-ae19-a20f74120c3c	PURCHASE	Level 4 income from Siddhant Gour	2026-05-05 08:38:13.715995+00
30	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	TEAM	3490	CREDIT	BINARY_MATCH	368400c2-4c41-412b-ae19-a20f74120c3c	PURCHASE	Binary commission from Siddhant Gour	2026-05-05 08:38:13.978484+00
31	8dc52dcb-5b7b-4b77-a23f-f12e9c0c991a	TEAM	558	CREDIT	LEVEL_BONUS	368400c2-4c41-412b-ae19-a20f74120c3c	PURCHASE	Level 5 income from Siddhant Gour	2026-05-05 08:38:14.030469+00
32	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	38132	CREDIT	DIRECT_COMMISSION	c6e2ca8c-6fe3-4542-8002-0da1d04d2c5b	PURCHASE	Direct commission from ali	2026-05-09 19:23:47.889917+00
33	38bafbe2-873f-420c-916a-bd729660a76b	TEAM	38132	CREDIT	BINARY_MATCH	c6e2ca8c-6fe3-4542-8002-0da1d04d2c5b	PURCHASE	Binary commission from ali	2026-05-09 19:23:47.993659+00
34	38bafbe2-873f-420c-916a-bd729660a76b	TEAM	4766	CREDIT	LEVEL_BONUS	c6e2ca8c-6fe3-4542-8002-0da1d04d2c5b	PURCHASE	Level 2 income from ali	2026-05-09 19:23:48.012188+00
35	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	89136	CREDIT	DIRECT_COMMISSION	479fd902-4186-4f51-822f-4bdcfbf56987	PURCHASE	Direct commission from hajra Ansari	2026-05-09 20:43:17.884499+00
36	38bafbe2-873f-420c-916a-bd729660a76b	TEAM	867	CREDIT	BINARY_MATCH	479fd902-4186-4f51-822f-4bdcfbf56987	PURCHASE	Binary commission from hajra Ansari	2026-05-09 20:43:17.945661+00
37	38bafbe2-873f-420c-916a-bd729660a76b	TEAM	108	CREDIT	LEVEL_BONUS	479fd902-4186-4f51-822f-4bdcfbf56987	PURCHASE	Level 2 income from hajra Ansari	2026-05-09 20:43:17.951605+00
38	e4dab429-54f0-420f-b794-6c5e23855ea5	DIRECT	190942	CREDIT	DIRECT_COMMISSION	5a36f4df-98a7-421b-bc19-de6d6bbd369e	PURCHASE	Direct commission from noorain ansari	2026-05-09 21:03:57.858589+00
39	fca2b6d8-e405-4838-b85f-80919fe0c362	DIRECT	12048	CREDIT	DIRECT_COMMISSION	8545aa97-b80e-4f24-906d-b82eeb3cc46a	PURCHASE	Direct commission from faizan ansari	2026-05-10 21:35:53.246124+00
40	e4dab429-54f0-420f-b794-6c5e23855ea5	DIRECT	2680	CREDIT	DIRECT_COMMISSION	1cba9abd-22e5-4ba6-98cf-6c415324d4ef	PURCHASE	Direct commission from noorain ansari	2026-05-15 18:41:47.179992+00
41	8dc57588-4f0f-4313-99bd-0605425f0ec5	DIRECT	50000	CREDIT	ADMIN_ADJUSTMENT	3cab786a-a9ae-4b34-a0c8-85df6d03404f	ADMIN	pin test (admin a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0)	2026-05-19 06:52:41.375337+00
42	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	50000	DEBIT	WITHDRAWAL	596ed308-1016-4106-82c3-8ed919a77ed4	PAYOUT	\N	2026-05-19 07:53:05.115564+00
43	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	50000	CREDIT	ADMIN_ADJUSTMENT	596ed308-1016-4106-82c3-8ed919a77ed4	PAYOUT	\N	2026-05-19 07:53:05.127146+00
44	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	60000	DEBIT	WITHDRAWAL	a2f1cec8-be8e-4eff-8ebc-774dcb2d51db	PAYOUT	\N	2026-05-19 07:55:33.29748+00
45	efd24093-d64e-4ebd-82c0-77c5c820fb3f	DIRECT	60000	CREDIT	ADMIN_ADJUSTMENT	a2f1cec8-be8e-4eff-8ebc-774dcb2d51db	PAYOUT	\N	2026-05-19 07:55:33.303296+00
46	8dc57588-4f0f-4313-99bd-0605425f0ec5	DIRECT	600000	CREDIT	ADMIN_ADJUSTMENT	731698dc-a19f-4361-8108-252d28e0e205	ADMIN	reset pin test (admin a821fe22-f8d6-4c8b-a8ec-33592b4cc3b0)	2026-05-19 08:14:00.287776+00
\.


--
-- Name: binary_tree_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.binary_tree_id_seq', 125, true);


--
-- Name: bv_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bv_ledger_id_seq', 81, true);


--
-- Name: commission_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.commission_config_id_seq', 90, true);


--
-- Name: daily_pair_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_pair_stats_id_seq', 9, true);


--
-- Name: fmcg_api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fmcg_api_keys_id_seq', 127, true);


--
-- Name: held_income_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.held_income_id_seq', 1, false);


--
-- Name: level_achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.level_achievements_id_seq', 1, false);


--
-- Name: level_bonus_slabs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.level_bonus_slabs_id_seq', 61, true);


--
-- Name: pair_match_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pair_match_log_id_seq', 9, true);


--
-- Name: payout_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payout_config_id_seq', 55, true);


--
-- Name: pending_bv_hold_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pending_bv_hold_id_seq', 6, true);


--
-- Name: sponsor_code_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sponsor_code_seq', 127, true);


--
-- Name: support_pre_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.support_pre_questions_id_seq', 2, true);


--
-- Name: support_ticket_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.support_ticket_messages_id_seq', 23, true);


--
-- Name: user_packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_packages_id_seq', 48, true);


--
-- Name: wallet_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wallet_ledger_id_seq', 46, true);


--
-- Name: admin_staff_permissions admin_staff_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_staff_permissions
    ADD CONSTRAINT admin_staff_permissions_pkey PRIMARY KEY (user_id, permission_key);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: binary_tree binary_tree_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binary_tree
    ADD CONSTRAINT binary_tree_pkey PRIMARY KEY (id);


--
-- Name: binary_tree binary_tree_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binary_tree
    ADD CONSTRAINT binary_tree_user_id_key UNIQUE (user_id);


--
-- Name: bv_ledger bv_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bv_ledger
    ADD CONSTRAINT bv_ledger_pkey PRIMARY KEY (id);


--
-- Name: commission_config commission_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_config
    ADD CONSTRAINT commission_config_config_key_key UNIQUE (config_key);


--
-- Name: commission_config commission_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_config
    ADD CONSTRAINT commission_config_pkey PRIMARY KEY (id);


--
-- Name: daily_pair_stats daily_pair_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pair_stats
    ADD CONSTRAINT daily_pair_stats_pkey PRIMARY KEY (id);


--
-- Name: daily_pair_stats daily_pair_stats_user_id_stat_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pair_stats
    ADD CONSTRAINT daily_pair_stats_user_id_stat_date_key UNIQUE (user_id, stat_date);


--
-- Name: dashboard_home_content dashboard_home_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_home_content
    ADD CONSTRAINT dashboard_home_content_pkey PRIMARY KEY (id);


--
-- Name: fmcg_api_keys fmcg_api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fmcg_api_keys
    ADD CONSTRAINT fmcg_api_keys_api_key_key UNIQUE (api_key);


--
-- Name: fmcg_api_keys fmcg_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fmcg_api_keys
    ADD CONSTRAINT fmcg_api_keys_pkey PRIMARY KEY (id);


--
-- Name: held_income held_income_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.held_income
    ADD CONSTRAINT held_income_pkey PRIMARY KEY (id);


--
-- Name: kyc_documents kyc_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_documents
    ADD CONSTRAINT kyc_documents_pkey PRIMARY KEY (document_id);


--
-- Name: kyc_requests kyc_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_requests
    ADD CONSTRAINT kyc_requests_pkey PRIMARY KEY (kyc_id);


--
-- Name: kyc_requests kyc_requests_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_requests
    ADD CONSTRAINT kyc_requests_user_id_key UNIQUE (user_id);


--
-- Name: level_achievements level_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.level_achievements
    ADD CONSTRAINT level_achievements_pkey PRIMARY KEY (id);


--
-- Name: level_achievements level_achievements_user_id_level_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.level_achievements
    ADD CONSTRAINT level_achievements_user_id_level_number_key UNIQUE (user_id, level_number);


--
-- Name: level_bonus_slabs level_bonus_slabs_level_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.level_bonus_slabs
    ADD CONSTRAINT level_bonus_slabs_level_number_key UNIQUE (level_number);


--
-- Name: level_bonus_slabs level_bonus_slabs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.level_bonus_slabs
    ADD CONSTRAINT level_bonus_slabs_pkey PRIMARY KEY (id);


--
-- Name: networker_users networker_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networker_users
    ADD CONSTRAINT networker_users_pkey PRIMARY KEY (user_id);


--
-- Name: p2p_transfers p2p_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.p2p_transfers
    ADD CONSTRAINT p2p_transfers_pkey PRIMARY KEY (transfer_id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (package_id);


--
-- Name: pair_match_log pair_match_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pair_match_log
    ADD CONSTRAINT pair_match_log_pkey PRIMARY KEY (id);


--
-- Name: path_rank_slabs path_rank_slabs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.path_rank_slabs
    ADD CONSTRAINT path_rank_slabs_pkey PRIMARY KEY (rank_level);


--
-- Name: payout_config payout_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_config
    ADD CONSTRAINT payout_config_config_key_key UNIQUE (config_key);


--
-- Name: payout_config payout_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_config
    ADD CONSTRAINT payout_config_pkey PRIMARY KEY (id);


--
-- Name: payout_requests payout_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT payout_requests_pkey PRIMARY KEY (payout_id);


--
-- Name: pending_bv_hold pending_bv_hold_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_bv_hold
    ADD CONSTRAINT pending_bv_hold_pkey PRIMARY KEY (id);


--
-- Name: placement_requests placement_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests
    ADD CONSTRAINT placement_requests_pkey PRIMARY KEY (id);


--
-- Name: placement_requests placement_requests_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests
    ADD CONSTRAINT placement_requests_user_id_key UNIQUE (user_id);


--
-- Name: support_pre_questions support_pre_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_pre_questions
    ADD CONSTRAINT support_pre_questions_pkey PRIMARY KEY (id);


--
-- Name: support_ticket_messages support_ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: user_packages user_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_packages
    ADD CONSTRAINT user_packages_pkey PRIMARY KEY (id);


--
-- Name: wallet_ledger wallet_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_pkey PRIMARY KEY (id);


--
-- Name: idx_api_keys_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_key ON public.fmcg_api_keys USING btree (api_key);


--
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_actor ON public.audit_logs USING btree (actor_id);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_bv_ledger_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bv_ledger_created_at ON public.bv_ledger USING btree (created_at);


--
-- Name: idx_bv_ledger_source_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bv_ledger_source_user ON public.bv_ledger USING btree (source_user_id);


--
-- Name: idx_bv_ledger_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bv_ledger_user_created ON public.bv_ledger USING btree (user_id, created_at);


--
-- Name: idx_bv_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bv_order ON public.bv_ledger USING btree (order_reference);


--
-- Name: idx_bv_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bv_status ON public.bv_ledger USING btree (status);


--
-- Name: idx_bv_unmatched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bv_unmatched ON public.bv_ledger USING btree (user_id, leg) WHERE (status = 'UNMATCHED'::public.bv_status);


--
-- Name: idx_bv_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bv_user ON public.bv_ledger USING btree (user_id);


--
-- Name: idx_bv_user_leg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bv_user_leg ON public.bv_ledger USING btree (user_id, leg);


--
-- Name: idx_held_income_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_held_income_status ON public.held_income USING btree (status);


--
-- Name: idx_held_income_user_period_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_held_income_user_period_status ON public.held_income USING btree (user_id, period_ym, status);


--
-- Name: idx_kyc_documents_kyc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_documents_kyc_id ON public.kyc_documents USING btree (kyc_id);


--
-- Name: idx_kyc_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_requests_status ON public.kyc_requests USING btree (status);


--
-- Name: idx_kyc_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_requests_user_id ON public.kyc_requests USING btree (user_id);


--
-- Name: idx_ledger_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_created ON public.wallet_ledger USING btree (created_at DESC);


--
-- Name: idx_ledger_idempotent; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_ledger_idempotent ON public.wallet_ledger USING btree (user_id, wallet_type, source, reference_id) WHERE (reference_id IS NOT NULL);


--
-- Name: idx_ledger_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_reference ON public.wallet_ledger USING btree (reference_id);


--
-- Name: idx_ledger_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_source ON public.wallet_ledger USING btree (source);


--
-- Name: idx_ledger_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_user ON public.wallet_ledger USING btree (user_id);


--
-- Name: idx_ledger_user_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_user_wallet ON public.wallet_ledger USING btree (user_id, wallet_type);


--
-- Name: idx_ledger_user_wallet_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_user_wallet_entry ON public.wallet_ledger USING btree (user_id, wallet_type, entry_type);


--
-- Name: idx_level_achievements_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_level_achievements_level ON public.level_achievements USING btree (level_number);


--
-- Name: idx_level_achievements_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_level_achievements_user ON public.level_achievements USING btree (user_id);


--
-- Name: idx_p2p_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_p2p_created ON public.p2p_transfers USING btree (created_at DESC);


--
-- Name: idx_p2p_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_p2p_receiver ON public.p2p_transfers USING btree (receiver_user_id, created_at DESC);


--
-- Name: idx_p2p_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_p2p_sender ON public.p2p_transfers USING btree (sender_user_id, created_at DESC);


--
-- Name: idx_packages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packages_status ON public.packages USING btree (status);


--
-- Name: idx_pair_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pair_created ON public.pair_match_log USING btree (created_at DESC);


--
-- Name: idx_pair_stats_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pair_stats_user_date ON public.daily_pair_stats USING btree (user_id, stat_date);


--
-- Name: idx_pair_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pair_user ON public.pair_match_log USING btree (user_id);


--
-- Name: idx_pair_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pair_user_created ON public.pair_match_log USING btree (user_id, created_at);


--
-- Name: idx_payout_requested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payout_requested ON public.payout_requests USING btree (requested_at DESC);


--
-- Name: idx_payout_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payout_status ON public.payout_requests USING btree (status);


--
-- Name: idx_payout_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payout_user ON public.payout_requests USING btree (user_id);


--
-- Name: idx_pbh_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pbh_user ON public.pending_bv_hold USING btree (source_user_id, status);


--
-- Name: idx_pr_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pr_expiry ON public.placement_requests USING btree (status, expires_at);


--
-- Name: idx_pr_sponsor_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pr_sponsor_pending ON public.placement_requests USING btree (sponsor_user_id, status);


--
-- Name: idx_staff_perm_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_perm_key ON public.admin_staff_permissions USING btree (permission_key);


--
-- Name: idx_staff_perm_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_perm_user ON public.admin_staff_permissions USING btree (user_id);


--
-- Name: idx_support_messages_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_ticket ON public.support_ticket_messages USING btree (ticket_id, created_at);


--
-- Name: idx_support_tickets_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_assigned ON public.support_tickets USING btree (assigned_to) WHERE (assigned_to IS NOT NULL);


--
-- Name: idx_support_tickets_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status_created ON public.support_tickets USING btree (status, created_at DESC);


--
-- Name: idx_support_tickets_unassigned_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_unassigned_open ON public.support_tickets USING btree (created_at DESC) WHERE ((assigned_to IS NULL) AND (status <> 'closed'::public.support_ticket_status));


--
-- Name: idx_support_tickets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_user ON public.support_tickets USING btree (user_id, created_at DESC);


--
-- Name: idx_support_topics_active_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_topics_active_sort ON public.support_pre_questions USING btree (is_active, sort_order, id);


--
-- Name: idx_tree_left_child; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tree_left_child ON public.binary_tree USING btree (left_child_id);


--
-- Name: idx_tree_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tree_parent ON public.binary_tree USING btree (parent_id);


--
-- Name: idx_tree_right_child; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tree_right_child ON public.binary_tree USING btree (right_child_id);


--
-- Name: idx_tree_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tree_user ON public.binary_tree USING btree (user_id);


--
-- Name: idx_user_packages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_packages_status ON public.user_packages USING btree (status);


--
-- Name: idx_user_packages_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_packages_user ON public.user_packages USING btree (user_id);


--
-- Name: idx_users_current_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_current_level ON public.networker_users USING btree (current_level);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.networker_users USING btree (email);


--
-- Name: idx_users_email_unique_except_dev; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email_unique_except_dev ON public.networker_users USING btree (lower(TRIM(BOTH FROM (email)::text))) WHERE (lower(TRIM(BOTH FROM (email)::text)) <> 'faizanvector@gmail.com'::text);


--
-- Name: idx_users_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_period ON public.networker_users USING btree (income_period_ym);


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_phone ON public.networker_users USING btree (phone);


--
-- Name: idx_users_phone_unique_except_demo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_phone_unique_except_demo ON public.networker_users USING btree (phone) WHERE ((phone IS NOT NULL) AND ((phone)::text <> '+918600000889'::text));


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.networker_users USING btree (role);


--
-- Name: idx_users_sc_wallet_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_sc_wallet_code ON public.networker_users USING btree (sc_wallet_code) WHERE (sc_wallet_code IS NOT NULL);


--
-- Name: idx_users_sponsor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_sponsor_id ON public.networker_users USING btree (sponsor_id);


--
-- Name: idx_users_sponsor_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_sponsor_user ON public.networker_users USING btree (sponsor_user_id);


--
-- Name: idx_users_staff_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_staff_created_by ON public.networker_users USING btree (staff_created_by) WHERE (staff_created_by IS NOT NULL);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.networker_users USING btree (status);


--
-- Name: admin_staff_permissions admin_staff_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_staff_permissions
    ADD CONSTRAINT admin_staff_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.networker_users(user_id);


--
-- Name: admin_staff_permissions admin_staff_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_staff_permissions
    ADD CONSTRAINT admin_staff_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.networker_users(user_id);


--
-- Name: binary_tree binary_tree_left_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binary_tree
    ADD CONSTRAINT binary_tree_left_child_id_fkey FOREIGN KEY (left_child_id) REFERENCES public.networker_users(user_id);


--
-- Name: binary_tree binary_tree_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binary_tree
    ADD CONSTRAINT binary_tree_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.networker_users(user_id);


--
-- Name: binary_tree binary_tree_right_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binary_tree
    ADD CONSTRAINT binary_tree_right_child_id_fkey FOREIGN KEY (right_child_id) REFERENCES public.networker_users(user_id);


--
-- Name: binary_tree binary_tree_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.binary_tree
    ADD CONSTRAINT binary_tree_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- Name: bv_ledger bv_ledger_source_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bv_ledger
    ADD CONSTRAINT bv_ledger_source_user_id_fkey FOREIGN KEY (source_user_id) REFERENCES public.networker_users(user_id);


--
-- Name: bv_ledger bv_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bv_ledger
    ADD CONSTRAINT bv_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- Name: commission_config commission_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_config
    ADD CONSTRAINT commission_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.networker_users(user_id);


--
-- Name: daily_pair_stats daily_pair_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pair_stats
    ADD CONSTRAINT daily_pair_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- Name: networker_users fk_users_package; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networker_users
    ADD CONSTRAINT fk_users_package FOREIGN KEY (current_package_id) REFERENCES public.packages(package_id);


--
-- Name: held_income held_income_released_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.held_income
    ADD CONSTRAINT held_income_released_ledger_id_fkey FOREIGN KEY (released_ledger_id) REFERENCES public.wallet_ledger(id);


--
-- Name: held_income held_income_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.held_income
    ADD CONSTRAINT held_income_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- Name: kyc_documents kyc_documents_kyc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_documents
    ADD CONSTRAINT kyc_documents_kyc_id_fkey FOREIGN KEY (kyc_id) REFERENCES public.kyc_requests(kyc_id) ON DELETE CASCADE;


--
-- Name: kyc_requests kyc_requests_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_requests
    ADD CONSTRAINT kyc_requests_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.networker_users(user_id);


--
-- Name: kyc_requests kyc_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_requests
    ADD CONSTRAINT kyc_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id) ON DELETE CASCADE;


--
-- Name: level_achievements level_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.level_achievements
    ADD CONSTRAINT level_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- Name: networker_users networker_users_sponsor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networker_users
    ADD CONSTRAINT networker_users_sponsor_user_id_fkey FOREIGN KEY (sponsor_user_id) REFERENCES public.networker_users(user_id);


--
-- Name: networker_users networker_users_staff_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networker_users
    ADD CONSTRAINT networker_users_staff_created_by_fkey FOREIGN KEY (staff_created_by) REFERENCES public.networker_users(user_id);


--
-- Name: p2p_transfers p2p_transfers_credit_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.p2p_transfers
    ADD CONSTRAINT p2p_transfers_credit_ledger_id_fkey FOREIGN KEY (credit_ledger_id) REFERENCES public.wallet_ledger(id);


--
-- Name: p2p_transfers p2p_transfers_debit_ledger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.p2p_transfers
    ADD CONSTRAINT p2p_transfers_debit_ledger_id_fkey FOREIGN KEY (debit_ledger_id) REFERENCES public.wallet_ledger(id);


--
-- Name: p2p_transfers p2p_transfers_receiver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.p2p_transfers
    ADD CONSTRAINT p2p_transfers_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.networker_users(user_id);


--
-- Name: p2p_transfers p2p_transfers_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.p2p_transfers
    ADD CONSTRAINT p2p_transfers_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.networker_users(user_id);


--
-- Name: pair_match_log pair_match_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pair_match_log
    ADD CONSTRAINT pair_match_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- Name: payout_requests payout_requests_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT payout_requests_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.networker_users(user_id);


--
-- Name: payout_requests payout_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payout_requests
    ADD CONSTRAINT payout_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- Name: pending_bv_hold pending_bv_hold_source_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_bv_hold
    ADD CONSTRAINT pending_bv_hold_source_user_id_fkey FOREIGN KEY (source_user_id) REFERENCES public.networker_users(user_id);


--
-- Name: placement_requests placement_requests_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests
    ADD CONSTRAINT placement_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.networker_users(user_id);


--
-- Name: placement_requests placement_requests_sponsor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests
    ADD CONSTRAINT placement_requests_sponsor_user_id_fkey FOREIGN KEY (sponsor_user_id) REFERENCES public.networker_users(user_id);


--
-- Name: placement_requests placement_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_requests
    ADD CONSTRAINT placement_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- Name: support_ticket_messages support_ticket_messages_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.networker_users(user_id);


--
-- Name: support_ticket_messages support_ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.networker_users(user_id);


--
-- Name: support_tickets support_tickets_closed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_closed_by_user_id_fkey FOREIGN KEY (closed_by_user_id) REFERENCES public.networker_users(user_id);


--
-- Name: support_tickets support_tickets_pre_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pre_question_id_fkey FOREIGN KEY (pre_question_id) REFERENCES public.support_pre_questions(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id) ON DELETE CASCADE;


--
-- Name: user_packages user_packages_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_packages
    ADD CONSTRAINT user_packages_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(package_id);


--
-- Name: user_packages user_packages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_packages
    ADD CONSTRAINT user_packages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- Name: wallet_ledger wallet_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_ledger
    ADD CONSTRAINT wallet_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.networker_users(user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict MpUrs4ia35XD8e8KUHi6KTKEUcORQcZC0mZYMQPGBu7MPYo9KnNq5z6DcRC8ugN

