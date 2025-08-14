import { Subscription, Member } from '@/types';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  maxGroups: number;
  aiInsights: boolean;
  prioritySupport: boolean;
  isPopular?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Community',
    price: 0,
    interval: 'monthly',
    features: [
      'Join up to 2 groups',
      'Basic chat functionality',
      'AI facilitator responses',
      'Community support',
    ],
    maxGroups: 2,
    aiInsights: false,
    prioritySupport: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9,
    interval: 'monthly',
    features: [
      'Join unlimited groups',
      'Advanced chat features',
      'AI facilitator + personal insights',
      'Progress tracking',
      'Priority support',
      'Export conversation history',
    ],
    maxGroups: -1,
    aiInsights: true,
    prioritySupport: true,
    isPopular: true,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    interval: 'monthly',
    features: [
      'All Premium features',
      'Therapist dashboard access',
      'Patient monitoring tools',
      'HIPAA compliance',
      'Custom reporting',
      'API access',
      'White-label options',
    ],
    maxGroups: -1,
    aiInsights: true,
    prioritySupport: true,
  },
];

export class SubscriptionService {
  static async getCurrentSubscription(memberId: string): Promise<Subscription | null> {
    const mockSubscription: Subscription = {
      id: '1',
      memberId,
      type: 'free',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priceId: 'free',
    };

    return mockSubscription;
  }

  static async upgradeSubscription(memberId: string, planId: string, paymentMethodId: string): Promise<Subscription> {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) throw new Error('Invalid subscription plan');

    const newSubscription: Subscription = {
      id: Date.now().toString(),
      memberId,
      type: plan.id as any,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priceId: planId,
    };

    await this.processPayment(plan.price, paymentMethodId);

    return newSubscription;
  }

  static async cancelSubscription(subscriptionId: string): Promise<void> {
    console.log(`Cancelling subscription: ${subscriptionId}`);
  }

  static async resumeSubscription(subscriptionId: string): Promise<void> {
    console.log(`Resuming subscription: ${subscriptionId}`);
  }

  static async getPaymentMethods(_memberId: string): Promise<PaymentMethod[]> {
    const mockPaymentMethods: PaymentMethod[] = [
      {
        id: '1',
        type: 'card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true,
      },
    ];

    return mockPaymentMethods;
  }

  static async addPaymentMethod(_memberId: string, paymentData: any): Promise<PaymentMethod> {
    const newPaymentMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: paymentData.type,
      last4: paymentData.last4,
      expiryMonth: paymentData.expiryMonth,
      expiryYear: paymentData.expiryYear,
      isDefault: false,
    };

    return newPaymentMethod;
  }

  static async removePaymentMethod(paymentMethodId: string): Promise<void> {
    console.log(`Removing payment method: ${paymentMethodId}`);
  }

  static async processPayment(amount: number, paymentMethodId: string): Promise<void> {
    console.log(`Processing payment of $${amount} with method ${paymentMethodId}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (Math.random() > 0.9) {
      throw new Error('Payment failed. Please try again.');
    }
  }

  static async generateInvoice(subscriptionId: string, periodStart: Date, _periodEnd: Date): Promise<string> {
    return `invoice-${subscriptionId}-${periodStart.getTime()}`;
  }

  static async getUsageLimits(member: Member): Promise<{
    maxGroups: number;
    currentGroups: number;
    aiInsightsEnabled: boolean;
    prioritySupport: boolean;
  }> {
    const subscription = await this.getCurrentSubscription(member.id);
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription?.type) || SUBSCRIPTION_PLANS[0];

    return {
      maxGroups: plan.maxGroups,
      currentGroups: 2,
      aiInsightsEnabled: plan.aiInsights,
      prioritySupport: plan.prioritySupport,
    };
  }

  static canMemberJoinGroup(member: Member, currentGroupCount: number): boolean {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === (member.isPremium ? 'premium' : 'free'));
    if (!plan) return false;

    return plan.maxGroups === -1 || currentGroupCount < plan.maxGroups;
  }

  static async requestRefund(subscriptionId: string, reason: string): Promise<void> {
    console.log(`Refund requested for subscription ${subscriptionId}: ${reason}`);
  }

  static async updateBillingAddress(memberId: string, _address: any): Promise<void> {
    console.log(`Updating billing address for member ${memberId}`);
  }

  static async getSubscriptionAnalytics(_memberId: string): Promise<{
    totalRevenue: number;
    activeSubscriptions: number;
    churnRate: number;
    avgRevenuePerUser: number;
  }> {
    return {
      totalRevenue: 12500,
      activeSubscriptions: 156,
      churnRate: 0.05,
      avgRevenuePerUser: 8.20,
    };
  }
}