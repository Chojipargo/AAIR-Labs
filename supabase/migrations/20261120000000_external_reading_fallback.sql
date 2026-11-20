-- External readings can name a backup link (usually a web archive snapshot)
-- to use when the primary source stops responding. "How to Read a Paper" is
-- the first entry that needs one: the Stanford course host that served the PDF
-- (web.stanford.edu) stopped accepting connections in November 2026.

alter table public.external_readings
  add column if not exists fallback_url text;

alter table public.external_readings
  drop constraint if exists external_readings_fallback_url_http;

alter table public.external_readings
  add constraint external_readings_fallback_url_http
  check (fallback_url is null or fallback_url ~* '^https?://');

update public.external_readings
set
  source_url = 'https://svr-sk818-web.cl.cam.ac.uk/keshav/papers/07/paper-reading.pdf',
  fallback_url = 'https://web.archive.org/web/20261025162528/https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf'
where id = '1cd0f300-56e3-4855-93f8-09cffb1f6a1b';
