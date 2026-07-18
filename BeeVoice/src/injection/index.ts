import type { InjectionInput } from '../types.js';

export interface InjectionService {
  inject(input: InjectionInput): Promise<void>;
}

export class InjectionServiceStub implements InjectionService {
  async inject(input: InjectionInput): Promise<void> {
    console.log(`[BeeVoice:injection:stub] would inject: "${input.text}"`);
  }
}
