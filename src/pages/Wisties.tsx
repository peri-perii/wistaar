import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Info, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface WistiesTransaction {
  id: string;
  amount: number;
  type: 'refund' | 'purchase_spend' | 'promo' | 'admin_adjustment';
  description: string;
  created_at: string;
}

const Wisties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WistiesTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWistiesData = async () => {
      setIsLoading(true);
      try {
        // Fetch balance
        const { data: balanceData, error: balanceError } = await supabase
          .from('wisties_balance')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();

        if (balanceError) throw balanceError;
        setBalance(balanceData?.balance || 0);

        // Fetch transactions
        const { data: txData, error: txError } = await supabase
          .from('wisties_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (txError) throw txError;
        setTransactions(txData || []);
      } catch (error) {
        console.error('Error fetching Wisties:', error);
        toast({
          title: "Error loading Wisties",
          description: "Could not load your Wisties balance.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWistiesData();
  }, [user, toast]);

  // Calculate running balance per row
  let currentRunningBalance = balance;
  const txWithBalance = transactions.map((tx) => {
    const rowBalance = currentRunningBalance;
    currentRunningBalance = currentRunningBalance - tx.amount; // rollback
    return { ...tx, runningBalance: rowBalance };
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
      <Link
        to="/profile"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Profile
      </Link>

      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-[#c97b63]/10 to-[#b5654d]/5 border-[#c97b63]/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldAlert className="w-32 h-32" />
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-4xl text-[#8b4530]">Wisties</CardTitle>
              <CardDescription className="text-base text-foreground/80">
                Your digital store credit for purchasing books on Wistaar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight">₹{balance}</span>
                <span className="text-xl font-medium text-muted-foreground">Available</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="w-full bg-card rounded-lg border shadow-sm">
            <AccordionItem value="how-it-works" className="border-none">
              <AccordionTrigger className="px-6 hover:no-underline [&[data-state=open]]:border-b">
                <div className="flex items-center gap-2 font-medium">
                  <Info className="w-5 h-5 text-[#c97b63]" />
                  How Wisties work
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 text-muted-foreground space-y-3">
                <p>• <strong>1 Wistie = ₹1</strong> in purchasing power on the Wistaar platform.</p>
                <p>• Earned from refunded books or promotional campaigns.</p>
                <p>• Can be spent on any book available in the Wistaar marketplace.</p>
                <p>• Wisties <strong>never expire</strong>, but they cannot be converted back to real cash.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        <div className="space-y-4">
          <h3 className="text-xl font-serif font-medium">Transaction History</h3>
          
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <Card className="py-12 border-dashed">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <Clock className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No Wisties yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  They will appear here when you refund a book or receive a promo credit.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground border-b uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                    <th className="px-6 py-3 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {txWithBalance.map((tx, idx) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {tx.description}
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${tx.amount > 0 ? 'text-green-600' : ''}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">
                        ₹{tx.runningBalance}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wisties;
