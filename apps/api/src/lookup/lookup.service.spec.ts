import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { LookupService, mapIndustry, statements, teamSizeFor } from './lookup.service';

const entity = (id: string, label: string, claims: Record<string, unknown[]>) =>
  ({ id, labels: { en: { value: label } }, descriptions: { en: { value: `${label} description` } }, claims });
const item = (id: string) => [{ mainsnak: { datavalue: { value: { id } } } }];
const value = (v: unknown) => [{ mainsnak: { datavalue: { value: v } } }];
const ranked = (v: unknown, rank: string, time?: string) =>
  ({ rank, mainsnak: { datavalue: { value: v } }, ...(time && { qualifiers: { P585: [{ datavalue: { value: { time } } }] } }) });

describe('LookupService', () => {
  const fetchMock = jest.fn();
  let warn: jest.SpyInstance;
  beforeAll(() => {
    (global as any).fetch = fetchMock;
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { fetchMock.mockReset(); warn.mockClear(); });
  const reply = (body: unknown) => fetchMock.mockResolvedValueOnce({ ok: true, json: async () => body });

  it('keeps only companies and maps what Wikidata knows onto the profile', async () => {
    reply({ search: [{ id: 'Q1' }, { id: 'Q2' }] });
    reply({ entities: {
      Q1: entity('Q1', 'Shopify', { P452: item('Q10'), P1128: value({ amount: '+10000' }), P856: value('https://www.shopify.com'), P17: item('Q16'), P154: value('Shopify logo.svg') }),
      Q2: entity('Q2', 'Patagonia', { P31: item('Q82794') }), // a region: no industry, no headcount
    } });
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('wbgetclaims')
        ? { claims: { P297: value('CA') } }
        : { entities: { Q10: { id: 'Q10', labels: { en: { value: 'e-commerce' } } }, Q16: { id: 'Q16', labels: { en: { value: 'Canada' } } } } }),
    }));

    const [shop, ...rest] = await new LookupService().companies('shopify');
    expect(rest).toHaveLength(0);
    expect(shop).toMatchObject({
      name: 'Shopify', website: 'https://www.shopify.com', domain: 'shopify.com',
      industryLabel: 'e-commerce', industry: 'Retail & e-commerce', employees: 10000, teamSize: '200+', country: 'Canada', countryCode: 'CA',
      logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Shopify%20logo.svg?width=96',
    });
  });

  it('has no logo without a Commons logo (no third-party icon service)', async () => {
    reply({ search: [{ id: 'Q1' }] });
    reply({ entities: { Q1: entity('Q1', 'Acme', { P1128: value({ amount: '+40' }), P856: value('https://acme.com') }) } });
    const [acme] = await new LookupService().companies('acme');
    expect(acme.logoUrl).toBeNull();
    expect(acme.countryCode).toBeNull();
  });

  it('follows statement ranks: preferred first, deprecated never, otherwise the latest point in time', async () => {
    const latest = { P1128: [ranked({ amount: '+100' }, 'normal', '+2019-01-01T00:00:00Z'), ranked({ amount: '+300' }, 'normal', '+2023-01-01T00:00:00Z'), ranked({ amount: '+900' }, 'deprecated', '+2024-01-01T00:00:00Z')] };
    expect(statements(latest as any, 'P1128')[0].mainsnak?.datavalue?.value.amount).toBe('+300');
    expect(statements(latest as any, 'P1128')).toHaveLength(2);
    const preferred = { P856: [ranked('https://old.example', 'normal'), ranked('https://new.example', 'preferred')] };
    expect(statements(preferred as any, 'P856').map((s) => s.mainsnak?.datavalue?.value)).toEqual(['https://new.example']);

    reply({ search: [{ id: 'Q1' }] });
    reply({ entities: { Q1: entity('Q1', 'Acme', latest) } });
    const [acme] = await new LookupService().companies('acme');
    expect(acme.employees).toBe(300);
  });

  it('caches repeat searches, shares identical searches in flight and ignores one-letter queries', async () => {
    const svc = new LookupService();
    reply({ search: [] });
    await Promise.all([svc.companies('Acme'), svc.companies('ACME')]);
    await svc.companies('  acme ');
    await svc.companies('a');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports an outage as 503, remembers it briefly, and never logs what was typed', async () => {
    const svc = new LookupService();
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(svc.companies('Jane Doe Bakery')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(svc.companies('Jane Doe Bakery')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).not.toMatch(/jane/i);
  });

  it('spends one time budget across all of its calls', async () => {
    const ctrl = new AbortController();
    const timeout = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(ctrl.signal);
    reply({ search: [{ id: 'Q1' }] });
    // the second call hangs until the shared budget runs out
    fetchMock.mockImplementationOnce((_url: string, init: { signal: AbortSignal }) =>
      new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))));
    const pending = new LookupService().companies('slowco');
    await new Promise((r) => setImmediate(r));
    ctrl.abort();
    await expect(pending).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(timeout).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(fetchMock.mock.calls.map((c) => c[1].signal)).toEqual([ctrl.signal, ctrl.signal]);
    timeout.mockRestore();
  });

  it('maps industries and headcounts', () => {
    expect(mapIndustry(['financial services'])).toBe('Finance & insurance');
    expect(mapIndustry(['coffee roasting'])).toBe('Food & hospitality');
    expect(mapIndustry(['property management'])).toBe('Real estate');
    expect(mapIndustry(['sports'])).toBe('Events & entertainment');
    expect(mapIndustry(['quarrying'])).toBeNull();
    expect([1, 8, 40, 150, 5000, 0].map(teamSizeFor)).toEqual(['Just me', '2–10', '11–50', '51–200', '200+', null]);
  });

  it('does not match words that merely contain a keyword', () => {
    expect(mapIndustry(['transport'])).toBeNull(); // not "sport"
    expect(mapIndustry(['intellectual property'])).toBeNull(); // not real estate
    expect(mapIndustry(['data storage'])).toBeNull(); // not "store"
    expect(mapIndustry(['lawn care'])).toBeNull(); // not "law", not "care"
    expect(mapIndustry(['biotechnology'])).toBeNull(); // not "technology"
    expect(mapIndustry(['shipbuilding'])).toBeNull(); // not "building"
  });
});
