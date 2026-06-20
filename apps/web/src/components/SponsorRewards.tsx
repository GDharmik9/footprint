import { Gift } from 'lucide-react';
import type { Voucher } from '@footprint/shared-types';

interface SponsorRewardsProps {
  vouchers: Voucher[];
  redeemVoucher: (sponsor: string, rewardType: 'tree' | 'discount' | 'plug', cost: number) => Promise<void>;
}

export default function SponsorRewards({
  vouchers,
  redeemVoucher
}: SponsorRewardsProps) {
  return (
    <div className="panel-card glass-panel">
      <h2 className="panel-title"><Gift size={20} color="var(--warning)" /> Sponsor Rewards Hub</h2>

      <div className="sponsor-banner">
        <div className="sponsor-logo arcadia">ARCADIA</div>
        <div className="sponsor-info">
          <div className="sponsor-title">Smart Energy Plug</div>
          <div className="sponsor-text">Link utility account and receive a free smart power plug. (Cost: 1500 Leaves)</div>
        </div>
        <button
          className="sponsor-btn"
          onClick={() => redeemVoucher('Arcadia Energy', 'plug', 1500)}
        >
          Claim
        </button>
      </div>

      <div className="sponsor-banner oatly" style={{ marginTop: '12px' }}>
        <div className="sponsor-logo oatly">OATLY</div>
        <div className="sponsor-info">
          <div className="sponsor-title">15% Brand Voucher</div>
          <div className="sponsor-text">Claim a 15% barcode discount for milk-substitutes. (Cost: 500 Leaves)</div>
        </div>
        <button
          className="sponsor-btn"
          onClick={() => redeemVoucher('Oatly', 'discount', 500)}
        >
          Claim
        </button>
      </div>

      <div className="sponsor-banner" style={{ marginTop: '12px', background: 'linear-gradient(135deg, hsla(142, 70%, 45%, 0.15) 0%, hsla(150, 90%, 60%, 0.05) 100%)', borderColor: 'var(--primary)' }}>
        <div className="sponsor-logo" style={{ background: 'var(--primary)', color: 'white' }}>EDEN</div>
        <div className="sponsor-info">
          <div className="sponsor-title">Plant 1 Physical Tree</div>
          <div className="sponsor-text">Eden Projects plants one real tree funded by B-Corp escrow. (Cost: 100 Leaves)</div>
        </div>
        <button
          className="sponsor-btn"
          onClick={() => redeemVoucher('Eden Projects', 'tree', 100)}
        >
          Fund Tree
        </button>
      </div>

      {/* Redeemed Vouchers list */}
      {vouchers.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <span className="simulator-title" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>Your Redeemed Rewards</span>
          <div className="vouchers-list">
            {vouchers.map(v => (
              <div key={v.id} className="voucher-item">
                <div className="voucher-header">
                  <span className="voucher-title">{v.title}</span>
                  {v.couponCode && <span className="voucher-code">{v.couponCode}</span>}
                </div>
                <div className="voucher-desc">{v.description}</div>
                {v.rewardType === 'discount' && (
                  <div className="barcode-visual" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
