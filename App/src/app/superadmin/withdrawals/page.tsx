import {
  getWithdrawals,
  getGlobalWithdrawalSettings,
} from "@/lib/actions/admin";
import { WithdrawalList } from "@/components/admin/WithdrawalList";
import { GlobalWithdrawalToggle } from "@/components/admin/GlobalWithdrawalToggle";

export default async function WithdrawalsPage() {
  // getWithdrawals checks for SuperAdmin internally too
  const [withdrawalsRes, settingsRes] = await Promise.all([
    getWithdrawals(),
    getGlobalWithdrawalSettings(),
  ]);

  const safeWithdrawals = withdrawalsRes.withdrawals || [];
  const withdrawalsEnabled = settingsRes.success ? settingsRes.isEnabled : true;

  return (
    <div>
      <GlobalWithdrawalToggle initialEnabled={withdrawalsEnabled} />
      <WithdrawalList withdrawals={safeWithdrawals} />
    </div>
  );
}
