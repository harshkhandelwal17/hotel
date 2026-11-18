/**
 * Centralized Software Company Support & Contact Details
 */
export const COMPANY_SUPPORT = {
  name: 'NXHotel Platform Support',
  phone: '6265488046',
  displayPhone: '+91 6265488046',
  waNumber: '916265488046',
  getRenewalWaUrl: (hotelName = '', plan = '', status = 'expired') => {
    const msg = [
      `🏨 *NXHotel Software - Subscription Renewal / Support*`,
      `Namaste Support Team,`,
      `I would like to renew / activate the subscription for our hotel *${hotelName || 'Our Hotel'}*.`,
      `• Plan: ${plan || 'Standard Plan'}`,
      `• Status: ${status === 'expired' ? '⚠️ Expired (Locked)' : 'Active / Renewing'}`,
      `Please assist with payment and plan activation. Thank you!`
    ].join('\n');
    return `https://wa.me/916265488046?text=${encodeURIComponent(msg)}`;
  }
};
