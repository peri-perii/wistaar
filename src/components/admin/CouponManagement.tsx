import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tag, Plus, Trash2, Copy, Check, Percent, IndianRupee } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function CouponManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: generateCode(),
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_purchase: '',
    max_uses: '',
    expires_at: '',
  });

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('coupon_codes' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCoupons(data as unknown as Coupon[]);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !form.code.trim() || !form.discount_value) return;
    setCreating(true);
    try {
      const { error } = await supabase
        .from('coupon_codes' as any)
        .insert({
          code: form.code.trim().toUpperCase(),
          discount_type: form.discount_type,
          discount_value: parseFloat(form.discount_value),
          min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : 0,
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          expires_at: form.expires_at || null,
          created_by: user.id,
        } as any);
      if (error) throw error;
      toast({ title: 'Coupon created!', description: `Code ${form.code.toUpperCase()} is now active.` });
      setForm({ code: generateCode(), discount_type: 'percentage', discount_value: '', min_purchase: '', max_uses: '', expires_at: '' });
      setShowForm(false);
      await loadCoupons();
    } catch (err: any) {
      toast({ title: 'Failed to create coupon', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('coupon_codes' as any)
      .update({ is_active: !coupon.is_active } as any)
      .eq('id', coupon.id);
    if (!error) {
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('coupon_codes' as any)
      .delete()
      .eq('id', coupon.id);
    if (!error) {
      toast({ title: 'Coupon deleted' });
      await loadCoupons();
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isExpired = (expiresAt: string | null) =>
    expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-foreground">Coupon Codes</h3>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Coupon
        </Button>
      </div>

      {/* Create coupon form */}
      {showForm && (
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Tag className="w-5 h-5" />
              New Coupon Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.code}
                    onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="SAVE20"
                    className="font-mono uppercase"
                    maxLength={20}
                  />
                  <Button variant="outline" size="icon" onClick={() => setForm(p => ({ ...p, code: generateCode() }))}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={v => setForm(p => ({ ...p, discount_type: v as 'percentage' | 'fixed' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Discount Value {form.discount_type === 'percentage' ? '(%)' : '(₹)'}</Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))}
                  placeholder={form.discount_type === 'percentage' ? '20' : '50'}
                  min="0"
                  max={form.discount_type === 'percentage' ? '100' : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label>Min Purchase Amount (₹) <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  type="number"
                  value={form.min_purchase}
                  onChange={e => setForm(p => ({ ...p, min_purchase: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Uses <span className="text-muted-foreground">(optional, leave blank for unlimited)</span></Label>
                <Input
                  type="number"
                  value={form.max_uses}
                  onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))}
                  placeholder="Unlimited"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Expiry Date <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={!form.code || !form.discount_value || creating}>
                {creating ? 'Creating...' : 'Create Coupon'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupons list */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading coupons...</p>
      ) : coupons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Tag className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No coupons created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {coupons.map(coupon => {
            const expired = isExpired(coupon.expires_at);
            const exhausted = coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses;
            const statusBad = expired || exhausted;

            return (
              <Card key={coupon.id} className={`transition-colors ${!coupon.is_active || statusBad ? 'opacity-60' : 'hover:border-accent/30'}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 font-mono text-lg font-bold text-foreground bg-muted px-3 py-1 rounded-md">
                        {coupon.code}
                        <button
                          onClick={() => copyCode(coupon.code, coupon.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedId === coupon.id
                            ? <Check className="w-4 h-4 text-green-500" />
                            : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-primary font-semibold text-lg">
                        {coupon.discount_type === 'percentage'
                          ? <><Percent className="w-4 h-4" />{coupon.discount_value}% off</>
                          : <><IndianRupee className="w-4 h-4" />{coupon.discount_value} off</>
                        }
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex gap-2">
                        {expired && <Badge variant="outline" className="text-xs text-destructive border-destructive/30">Expired</Badge>}
                        {exhausted && <Badge variant="outline" className="text-xs text-destructive border-destructive/30">Exhausted</Badge>}
                        {!statusBad && (
                          <Badge variant="outline" className={coupon.is_active
                            ? 'text-xs bg-green-500/10 text-green-600 border-green-500/20'
                            : 'text-xs'
                          }>
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </div>

                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={() => handleToggleActive(coupon)}
                        disabled={statusBad}
                      />

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1 h-7 text-xs">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete coupon "{coupon.code}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(coupon)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                    {coupon.min_purchase > 0 && <span>Min purchase: ₹{coupon.min_purchase}</span>}
                    <span>Used: {coupon.uses_count}{coupon.max_uses ? `/${coupon.max_uses}` : ' times'}</span>
                    {coupon.expires_at && (
                      <span>Expires: {new Date(coupon.expires_at).toLocaleDateString()}</span>
                    )}
                    <span>Created: {new Date(coupon.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
