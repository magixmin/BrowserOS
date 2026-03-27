/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { z } from 'zod'
import { ProxyAuthManager } from '@/background/ProxyAuthManager'
import { ActionHandler } from '../ActionHandler'

const SetProxyAuthRuleInputSchema = z.object({
  ruleId: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().nullable(),
  username: z.string().min(1),
  password: z.string().min(1),
  tabId: z.number().int().optional(),
})

type SetProxyAuthRuleInput = z.infer<typeof SetProxyAuthRuleInputSchema>

export class SetProxyAuthRuleAction extends ActionHandler<
  SetProxyAuthRuleInput,
  { ruleId: string; activeRuleCount: number }
> {
  readonly inputSchema = SetProxyAuthRuleInputSchema

  async execute(
    input: SetProxyAuthRuleInput,
  ): Promise<{ ruleId: string; activeRuleCount: number }> {
    return ProxyAuthManager.getInstance().setRule(input)
  }
}
