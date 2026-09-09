-- Door-staff role for scanning event ticket QR codes and recording attendance.
--
-- Kept alone in its own migration on purpose: PostgreSQL refuses
-- `ALTER TYPE ... ADD VALUE` when it arrives as part of a multi-command
-- string, and on PostgreSQL 11 and older it may not run inside a transaction
-- at all. A single-statement migration applies cleanly either way, and the
-- new value is not referenced anywhere else in this file.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TICKET_OFFICER';
