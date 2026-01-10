import { getWithdrawals } from "@/lib/actions/admin";
import { WithdrawalList } from "@/components/admin/WithdrawalList";

export default async function WithdrawalsPage() {
  // getWithdrawals checks for SuperAdmin internally too
  const { withdrawals } = await getWithdrawals();
  const safeWithdrawals = withdrawals || [];

  return <WithdrawalList withdrawals={safeWithdrawals} />;
}
