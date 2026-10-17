import { Logger } from '@nestjs/common';
import { DemoService } from './demo.service';
import * as workspace from './demo-workspace';

describe('DemoService', () => {
  const config: any = { get: () => '30' };
  let reset: jest.SpyInstance;

  beforeAll(() => jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined));
  beforeEach(() => { reset = jest.spyOn(workspace, 'resetDemoWorkspace').mockResolvedValue('demo'); });
  afterEach(() => reset.mockRestore());

  it('resets once for simultaneous sign-ins, then not again until it is stale', async () => {
    const svc = new DemoService({} as any, config);
    await Promise.all([svc.resetIfStale(), svc.resetIfStale(), svc.resetIfStale()]);
    expect(reset).toHaveBeenCalledTimes(1);
    await svc.resetIfStale();
    expect(reset).toHaveBeenCalledTimes(1);
    await svc.resetIfStale(Date.now() + 31 * 60_000);
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('tries again next time if a reset fails', async () => {
    reset.mockRejectedValueOnce(new Error('db down'));
    const svc = new DemoService({} as any, config);
    await expect(svc.resetIfStale()).rejects.toThrow('db down');
    await svc.resetIfStale();
    expect(reset).toHaveBeenCalledTimes(2);
  });
});
