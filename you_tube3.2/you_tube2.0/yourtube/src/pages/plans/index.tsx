import React, { useEffect, useState } from "react";
import Script from "next/script";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const CYCLE_LABELS: any = { monthly: "/ month", quarterly: "/ 3 months", yearly: "/ year" };

const formatRupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const PlansPage = () => {
  const { user } = useUser();
  const [plans, setPlans] = useState<any>(null);
  const [cycle, setCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [subscription, setSubscription] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<"compare" | "billing">("compare");
  const [payingPlan, setPayingPlan] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const loadAll = async () => {
    try {
      const [plansRes, subRes, historyRes] = await Promise.all([
        axiosInstance.get("/billing/plans"),
        user ? axiosInstance.get("/billing/subscription") : Promise.resolve({ data: null }),
        user ? axiosInstance.get("/billing/history") : Promise.resolve({ data: [] }),
      ]);
      setPlans(plansRes.data);
      setSubscription(subRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user?._id]);

  const handleChoosePlan = async (planName: string) => {
    if (!user) {
      toast.error("Sign in first");
      return;
    }
    if (!scriptReady) {
      toast.error("Payment widget still loading, try again in a moment");
      return;
    }
    setPayingPlan(planName);
    try {
      const orderRes = await axiosInstance.post("/billing/create-order", { plan: planName, billingCycle: cycle });
      const { orderId, amount, currency, keyId } = orderRes.data;

      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "YourTube",
        description: `${planName} plan — ${cycle}`,
        handler: async (response: any) => {
          try {
            const verifyRes = await axiosInstance.post("/billing/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success(`You're now on the ${verifyRes.data.plan} plan! Invoice: ${verifyRes.data.invoiceNumber}`);
            loadAll();
          } catch (error) {
            toast.error("Payment succeeded but verification failed. Contact support.");
          } finally {
            setPayingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            axiosInstance.post("/billing/cancel-order", { razorpayOrderId: orderId }).catch(() => {});
            setPayingPlan(null);
          },
        },
        theme: { color: "#dc2626" },
      });
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setPayingPlan(null);
      });
      rzp.open();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Couldn't start checkout");
      setPayingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Cancel your subscription and move to the Free plan?")) return;
    try {
      await axiosInstance.post("/billing/cancel-subscription");
      toast.success("Subscription cancelled — you're back on the Free plan.");
      loadAll();
    } catch (error) {
      toast.error("Couldn't cancel subscription");
    }
  };

  if (!plans) return <main className="flex-1 p-6">Loading plans...</main>;

  return (
    <main className="flex-1 p-6 max-w-5xl">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptReady(true)} />

      <h1 className="text-2xl font-semibold mb-1">Subscription Plans</h1>
      <p className="text-sm text-gray-500 mb-6">Payments processed securely via Razorpay (Test Mode).</p>

      <div className="flex gap-2 border-b mb-6">
        <button className={`px-3 py-2 text-sm ${tab === "compare" ? "border-b-2 border-black font-medium" : "text-gray-500"}`} onClick={() => setTab("compare")}>
          Compare Plans
        </button>
        {user && (
          <button className={`px-3 py-2 text-sm ${tab === "billing" ? "border-b-2 border-black font-medium" : "text-gray-500"}`} onClick={() => setTab("billing")}>
            My Subscription & Billing
          </button>
        )}
      </div>

      {tab === "compare" && (
        <>
          <div className="flex gap-2 mb-6">
            {(["monthly", "quarterly", "yearly"] as const).map((c) => (
              <Button key={c} variant={cycle === c ? "default" : "outline"} size="sm" onClick={() => setCycle(c)}>
                {c[0].toUpperCase() + c.slice(1)}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(plans).map(([name, plan]: any) => {
              const isCurrent = subscription?.plan === name;
              const price = plan.prices[cycle];
              return (
                <div key={name} className={`border rounded-lg p-5 flex flex-col ${isCurrent ? "border-red-500 ring-1 ring-red-500" : ""}`}>
                  <h3 className="font-semibold text-lg">{plan.label}</h3>
                  <p className="text-2xl font-bold my-2">
                    {price === 0 ? "Free" : formatRupees(price)}
                    {price > 0 && <span className="text-sm font-normal text-gray-500">{CYCLE_LABELS[cycle]}</span>}
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 flex-1 mb-4">
                    {plan.features.map((f: string) => (
                      <li key={f}>✓ {f}</li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button disabled variant="outline">Current Plan</Button>
                  ) : name === "Free" ? (
                    user && subscription?.plan !== "Free" ? (
                      <Button variant="outline" onClick={handleCancelSubscription}>Downgrade to Free</Button>
                    ) : (
                      <Button disabled variant="outline">Default Plan</Button>
                    )
                  ) : (
                    <Button onClick={() => handleChoosePlan(name)} disabled={payingPlan === name}>
                      {payingPlan === name ? "Processing..." : "Choose Plan"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "billing" && user && (
        <div className="space-y-6">
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold mb-2">Current Subscription</h3>
            <p className="text-lg">{subscription?.plan} plan</p>
            {subscription?.expiry && (
              <p className="text-sm text-gray-500">
                Renews / expires {formatDistanceToNow(new Date(subscription.expiry), { addSuffix: true })}
                {" "}({subscription.daysRemaining} days remaining)
              </p>
            )}
            {subscription?.plan !== "Free" && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={handleCancelSubscription}>
                Cancel subscription
              </Button>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Billing History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((t) => (
                  <div key={t._id} className="flex justify-between items-center border rounded p-3 text-sm">
                    <div>
                      <p className="font-medium">{t.plan} — {t.billingCycle}</p>
                      <p className="text-gray-500 text-xs">
                        {t.invoiceNumber || "No invoice"} • {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p>{formatRupees(t.amount)}</p>
                      <p
                        className={`text-xs ${
                          t.status === "paid" ? "text-green-600" : t.status === "failed" ? "text-red-600" : "text-gray-500"
                        }`}
                      >
                        {t.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default PlansPage;
