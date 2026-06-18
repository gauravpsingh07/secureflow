-- Make AuditLog tamper-evident: existing entries can never be modified. A
-- BEFORE UPDATE trigger rejects any attempt to alter a row. INSERTs are allowed
-- (the log is append-only) and DELETEs remain permitted so tenant removal /
-- retention can cascade.

CREATE OR REPLACE FUNCTION secureflow_audit_no_update() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only; UPDATE is not permitted';
END;
$$;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION secureflow_audit_no_update();
