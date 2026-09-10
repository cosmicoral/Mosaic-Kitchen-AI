// The 14-day cancellation waiver, in the words the customer actually reads.
//
// Under the Consumer Contracts Regulations 2013 a UK consumer loses the 14-day
// right to cancel a digital service only if two things both happened before
// the service started: they expressly requested immediate performance, and
// they acknowledged that doing so costs them the right. One without the other
// does nothing, which is why the sentence below contains both halves and why
// it is a single unticked checkbox rather than a line inside the terms.
//
// It is required before checkout opens, and the reason is that the product has
// exactly one behaviour: the webhook grants Plus the moment payment succeeds.
// There is no code path that starts a subscription later, so offering "start
// it in 14 days instead" as a tick box would be advertising a feature that
// does not exist. The unticked path therefore says what is true — that we
// cannot do it automatically and they should email us — rather than promising
// a scheduler nobody wrote.
//
// It lives here rather than inside Stripe Checkout on purpose. Stripe's own
// consent collection offers one generic "I agree to the terms of service" box,
// which evidences agreement to a document rather than a specific
// acknowledgement, and it cannot be shown in Chinese. Collecting it ourselves
// means the evidence is a row in our database with a timestamp, a version, and
// the language the customer was reading at the time.
//
// WAIVER_VERSION is duplicated in backend/src/services/billingService.ts, and
// backend/tests/cancellationWaiver.test.ts fails if the two drift apart.

export const WAIVER_VERSION = '2026-09';

export const waiverText = {
  en: {
    label:
      'Please start my subscription straight away. I understand that because it starts ' +
      'immediately, I give up my right to cancel within 14 days for a refund.',
    detail:
      'We can only start a subscription immediately. If you would rather keep your 14-day ' +
      'cancellation right, do not tick this — email us instead and we will arrange a start ' +
      'date after the 14 days.',
    required: 'Tick the box above to continue, or email us to arrange a later start date.',
  },
  zh: {
    label:
      '请立即为我开通订阅。我明白由于订阅立即开始，我放弃 14 天内取消并退款的权利。',
    detail:
      '我们目前只能立即开通订阅。如果你希望保留 14 天取消权，请不要勾选——改为发邮件给我们，' +
      '我们会为你安排 14 天之后的开通日期。',
    required: '请勾选上方选项以继续，或发邮件给我们安排延后开通。',
  },
} as const;
