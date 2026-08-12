"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Crown, Download, Film, Sparkles } from "lucide-react";
import { toast } from "sonner";

import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIG, PLAN_ORDER, type PlanCode } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function DownloadsContent() {
  const { user, refreshUser } = useUser();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDownloads, setTodayDownloads] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanCode>("free");

  const videoUrl = (filepath = "") =>
    filepath.startsWith("http")
      ? filepath
      : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/${filepath.replace(/^\/+/, "")}`;

  const loadDownloads = async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    const localDownloads = JSON.parse(localStorage.getItem("yourtube-local-downloads") || "[]")
      .filter((item: any) => item.userId === user._id)
      .map((item: any) => ({ ...item, isLocal: true }));

    const localTodayDownloads = localDownloads.filter(
      (item: any) => new Date(item.downloadedAt).toDateString() === new Date().toDateString()
    ).length;

    try {
      const response = await axiosInstance.get(`/downloads/user/${user._id}`);
      setDownloads([...localDownloads, ...(response.data.downloads || [])]);
      setTodayDownloads((response.data.todayDownloads || 0) + localTodayDownloads);
      setIsPremium(response.data.isPremium || false);
      setCurrentPlan((response.data.currentPlan as PlanCode) || "free");
    } catch (error: any) {
      setDownloads(localDownloads);
      setTodayDownloads(localTodayDownloads);
      setIsPremium(Boolean(user.isPremium));
      setCurrentPlan((user.currentPlan as PlanCode) || "free");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDownloads();
  }, [user?._id]);

  const startPlanCheckout = async (planCode: PlanCode) => {
    if (!user?._id) {
      toast.error("Please sign in before upgrading.");
      return;
    }

    if (planCode === "free") {
      toast.error("Free is already available without payment.");
      return;
    }

    setIsCheckoutLoading(true);
    toast.dismiss();

    try {
      // 1. Backend Order Generation
      const orderResponse = await axiosInstance.post("/payments/plans/order", {
        planCode,
        userId: user._id,
      });

      const { amount, checkoutMode, order, planName, razorpayKeyId } = orderResponse.data;

      // 2. Development mode fallback handling
      if (checkoutMode === "development" || !razorpayKeyId) {
        const verifyResponse = await axiosInstance.post("/payments/plans/verify", {
          userId: user._id,
          razorpay_order_id: order.id,
          razorpay_payment_id: `dev_payment_${Date.now()}`,
        });

        setIsPremium(true);
        setCurrentPlan(planCode);
        await refreshUser?.(user._id);
        await loadDownloads();
        toast.success(`${verifyResponse.data.message || planName + " plan activated!"}`);
        return;
      }

      // 3. Load Razorpay Checkout Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Razorpay checkout script failed to load.");
        return;
      }

      // ⚡ 4. UPDATED: Razorpay Modal Options with Domestic Routing & Unsaved Card Safe Options
      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: amount,
        currency: "INR",
        name: "YourTube Premium",
        description: `${planName} plan upgrade`,
        order_id: order.id,
        handler: async (paymentResult: any) => {
          try {
            const verifyResponse = await axiosInstance.post(
              "/payments/plans/verify",
              {
                userId: user._id,
                ...paymentResult,
              }
            );

            setIsPremium(true);
            setCurrentPlan(planCode);
            await refreshUser?.(user._id);
            await loadDownloads();
            toast.success(verifyResponse.data.message || "Plan updated successfully!");
          } catch (err: any) {
            toast.error(err?.response?.data?.message || "Payment verification failed.");
          }
        },
        prefill: {
          email: user.email || "user@example.com",
          name: user.name || "Faiz Patel",
          contact: user.mobileNumber || "9876543210",
        },
        notes: {
          address: "India",
          planCode: planCode,
        },
        theme: {
          color: "#dc2626",
        },
      });

      razorpay.on("payment.failed", (response: any) => {
        toast.error(response?.error?.description || "Payment failed.");
      });

      razorpay.open();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to process plan upgrade.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Download className="mx-auto h-14 w-14 text-slate-400" />
        <h2 className="mt-4 text-2xl font-semibold text-slate-900">
          Sign in to view your downloads
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Downloaded videos and premium access are available on your account only.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading downloads...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                Downloads
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {isPremium
                  ? `${PLAN_CONFIG[currentPlan].displayName} downloads unlocked`
                  : "Daily free download limit"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isPremium
                  ? `Your ${PLAN_CONFIG[currentPlan].displayName} plan is active. You can download videos up to ${PLAN_CONFIG[currentPlan].watchLimitLabel.toLowerCase()}.`
                  : `You have used ${todayDownloads} of 1 free download available today.`}
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isPremium
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {PLAN_CONFIG[currentPlan].displayName}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-red-100 bg-[linear-gradient(135deg,#fff1f2_0%,#fff7ed_100%)] p-6 shadow-sm">
          <div className="flex items-center gap-3 text-red-600">
            <Crown className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em]">
              Watch plans
            </p>
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">
            Choose your access level
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Free users can watch only 5 minutes per video. Paid plans extend or remove that limit and keep premium downloads active.
          </p>
          <div className="mt-5 grid gap-3">
            {PLAN_ORDER.filter((planCode) => planCode !== "free").map((planCode) => {
              const plan = PLAN_CONFIG[planCode];
              const isActive = currentPlan === planCode;

              return (
                <div
                  key={planCode}
                  className="rounded-2xl border border-red-100 bg-white/80 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {plan.displayName}
                      </p>
                      <p className="text-sm text-slate-600">
                        {plan.amountLabel} | {plan.watchLimitLabel}
                      </p>
                    </div>
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => void startPlanCheckout(planCode)}
                      disabled={isActive || isCheckoutLoading}
                    >
                      <Sparkles className="h-4 w-4" />
                      {isActive
                        ? "Current Plan"
                        : isCheckoutLoading
                        ? "Processing..."
                        : `Choose ${plan.displayName}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {downloads.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <Film className="mx-auto h-14 w-14 text-slate-400" />
          <h3 className="mt-4 text-xl font-semibold text-slate-900">
            No downloads yet
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Download a video from any watch page and it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {downloads.map((item) => (
            <div
              key={item._id}
              className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"
            >
              <Link
                href={`/watch/${item.videoId?._id}`}
                className="block w-full max-w-[280px] flex-shrink-0"
              >
                <div className="overflow-hidden rounded-2xl bg-slate-100">
                  <video
                    src={item.isLocal ? item.videoId?.filepath : videoUrl(String(item.videoId?.filepath || "").replace(/\\/g, "/"))}
                    className="aspect-video w-full object-cover"
                  />
                </div>
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/watch/${item.videoId?._id}`}>
                  <h3 className="text-lg font-semibold text-slate-900 hover:text-red-600">
                    {item.videoId?.videotitle}
                  </h3>
                </Link>
                <p className="mt-1 text-sm text-slate-600">
                  {item.videoId?.videochanel}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Downloaded {formatDistanceToNow(new Date(item.downloadedAt))} ago
                </p>
                <a
                  href={item.isLocal ? item.videoId?.filepath : videoUrl(String(item.videoId?.filepath || "").replace(/\\/g, "/"))}
                  download
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                >
                  <Download className="h-4 w-4" />
                  Download Again
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}