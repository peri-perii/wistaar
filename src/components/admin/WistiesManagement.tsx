import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function WistiesManagement() {
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(10);
  const [refundWindowHours, setRefundWindowHours] = useState<number>(24);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txUserIdFilter, setTxUserIdFilter] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  useEffect(() => {
    loadSettings();
    loadTransactions();

    // Subscribe to real-time changes on platform settings and wisties transactions
    const wistiesSub = supabase
      .channel('wisties-admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => {
        loadSettings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wisties_transactions' }, () => {
        loadTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(wistiesSub);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('platform_settings').select('*').single();
      if (error) throw error;
      if (data) {
        setPlatformFeePercent(data.platform_fee_percent);
        setRefundWindowHours(data.wisties_refund_window_hours);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadTransactions = async () => {
    setIsLoadingTx(true);
    try {
      let query = supabase.from('wisties_transactions').select('*').order('created_at', { ascending: false }).limit(50);
      
      if (txUserIdFilter) {
        query = query.eq('user_id', txUserIdFilter);
      }
      if (txTypeFilter !== 'all') {
        query = query.eq('type', txTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      toast.error('Failed to load transactions');
    } finally {
      setIsLoadingTx(false);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { error } = await supabase.from('platform_settings').update({
        platform_fee_percent: platformFeePercent,
        wisties_refund_window_hours: refundWindowHours
      }).eq('id', 1);

      if (error) throw error;
      toast.success('Platform settings updated successfully');
    } catch (err: any) {
      toast.error('Failed to update settings: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const adjustBalance = async () => {
    if (!adjustUserId || !adjustAmount || !adjustReason) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsAdjusting(true);
    try {
      let targetUserId = adjustUserId.trim();
      if (targetUserId.includes('@')) {
        const { data: users, error: userError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', targetUserId)
          .maybeSingle();

        if (userError || !users) {
          toast.error('User with that email address not found');
          setIsAdjusting(false);
          return;
        }
        targetUserId = users.id;
      }

      const { error } = await supabase.rpc('admin_adjust_wisties', {
        p_user_id: targetUserId,
        p_amount: Number(adjustAmount),
        p_desc: adjustReason
      });

      if (error) throw error;
      toast.success('Balance adjusted successfully');
      setAdjustUserId('');
      setAdjustAmount('');
      setAdjustReason('');
      loadTransactions();
    } catch (err: any) {
      toast.error('Failed to adjust balance: ' + err.message);
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Settings</CardTitle>
            <CardDescription>Configure global fees and refund policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Platform Fee (%)</Label>
              <Input 
                type="number" 
                value={platformFeePercent} 
                onChange={(e) => setPlatformFeePercent(Number(e.target.value))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Wisties Refund Window (Hours)</Label>
              <Input 
                type="number" 
                value={refundWindowHours} 
                onChange={(e) => setRefundWindowHours(Number(e.target.value))} 
              />
            </div>
            <Button onClick={saveSettings} disabled={isSavingSettings}>
              {isSavingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Adjust User Balance */}
        <Card>
          <CardHeader>
            <CardTitle>Adjust Wisties Balance</CardTitle>
            <CardDescription>Manually credit or debit a user's account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>User ID (UUID) or Email</Label>
              <Input 
                placeholder="UUID or email (e.g. priyamj1502@gmail.com)" 
                value={adjustUserId} 
                onChange={(e) => setAdjustUserId(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (+ for credit, - for debit)</Label>
              <Input 
                type="number" 
                placeholder="100" 
                value={adjustAmount} 
                onChange={(e) => setAdjustAmount(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input 
                placeholder="Promotional credit" 
                value={adjustReason} 
                onChange={(e) => setAdjustReason(e.target.value)} 
              />
            </div>
            <Button onClick={adjustBalance} disabled={isAdjusting}>
              {isAdjusting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Adjust Balance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Wisties Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input 
              placeholder="Filter by User ID..." 
              value={txUserIdFilter} 
              onChange={(e) => setTxUserIdFilter(e.target.value)}
              className="max-w-xs"
            />
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm max-w-xs"
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="refund">Refund</option>
              <option value="purchase_spend">Purchase Spend</option>
              <option value="promo">Promo</option>
              <option value="admin_adjustment">Admin Adjustment</option>
            </select>
            <Button onClick={loadTransactions} disabled={isLoadingTx}>Search</Button>
          </div>

          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b uppercase text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">User ID</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{tx.user_id}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-muted rounded-full text-xs">{tx.type}</span></td>
                    <td className="px-4 py-3">{tx.description}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${tx.amount > 0 ? 'text-green-600' : ''}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-muted-foreground">No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
