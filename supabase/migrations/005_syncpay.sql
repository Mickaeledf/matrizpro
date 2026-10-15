-- ============================================================================
-- MatrizPro — gateway de pagamento: SyncPay (PIX)
--
-- A SyncPay devolve um código PIX "copia e cola" para cada cobrança; o app mostra
-- o QR Code. Guardamos o código para a pessoa poder abrir de novo o mesmo PIX.
-- O id da cobrança na SyncPay ("identifier") fica em pagamentos.pagamento_id.
-- ============================================================================

alter table public.pagamentos alter column gateway set default 'syncpay';
alter table public.pagamentos add column if not exists pix_codigo text;
