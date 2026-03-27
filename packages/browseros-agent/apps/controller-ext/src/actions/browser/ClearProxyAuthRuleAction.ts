/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { z } from 'zod'
import { ProxyAuthManager } from '@/background/ProxyAuthManager'
import { ActionHandler } from '../ActionHandler'

const ClearProxyAuthRuleInputSchema = z.object({
  ruleId: z.string().min(1),
})

type ClearProxyAuthRuleInput = z.infer<typeof ClearProxyAuthRuleInputSchema>

export class ClearProxyAuthRuleAction extends ActionHandler<
  ClearProxyAuthRuleInput,
  { removed: boolean; activeRuleCount: number }
> {
  readonly inputSchema = ClearProxyAuthRuleInputSchema

  async execute(
    input: ClearProxyAuthRuleInput,
  ): Promise<{ removed: boolean; activeRuleCount: number }> {
    return ProxyAuthManager.getInstance().clearRule(input.ruleId)
  }
}
