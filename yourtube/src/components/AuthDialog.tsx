"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  LocateFixed,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useUser } from "@/lib/AuthContext";
import {
  detectSouthStateFromCoordinates,
  isSouthState,
} from "@/lib/themeRules";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const ALL_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function AuthDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { sendOtp, verifyOtp } = useUser();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [form, setForm] = useState({
    city: "",
    email: "",
    mobileNumber: "",
    name: "",
    otp: "",
    state: "Tamil Nadu",
  });
  const [loading, setLoading] = useState(false);
  const [deliveryChannel, setDeliveryChannel] = useState<"email" | "mobile" | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationNote, setLocationNote] = useState("");

  const isSouth = useMemo(() => isSouthState(form.state), [form.state]);

  useEffect(() => {
    if (!open || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    let cancelled = false;
    setIsDetectingLocation(true);
    setLocationNote("Detecting your location for theme and OTP routing...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) {
          return;
        }

        const detectedState = detectSouthStateFromCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );

        if (detectedState) {
          setForm((prev) => ({ ...prev, state: detectedState }));
          setLocationNote(`Detected location in ${detectedState}.`);
        } else {
          setLocationNote(
            "Location detected outside the mapped South India regions. You can still choose your state manually."
          );
        }

        setIsDetectingLocation(false);
      },
      () => {
        if (!cancelled) {
          setLocationNote("Location access was unavailable. Choose your state manually.");
          setIsDetectingLocation(false);
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 5000,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [open]);

  const resetDialog = () => {
    setStep("details");
    setDeliveryChannel(null);
    setLocationNote("");
    setIsDetectingLocation(false);
    setForm({
      city: "",
      email: "",
      mobileNumber: "",
      name: "",
      otp: "",
      state: "Tamil Nadu",
    });
  };

  const handleSendOtp = async () => {
    setLoading(true);

    try {
      const response = await sendOtp(form);
      setDeliveryChannel(response.deliveryChannel);
      setStep("otp");
      toast.success(response.message);

      if (response.debugOtp) {
        toast.info(`Debug OTP: ${response.debugOtp}`);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to send OTP right now."
      );

      if (error?.response?.data?.debugOtp) {
        toast.info(`Debug OTP: ${error.response.data.debugOtp}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);

    try {
      await verifyOtp(form.email, form.otp);
      toast.success("Login verified successfully.");
      onOpenChange(false);
      resetDialog();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          resetDialog();
        }
      }}
    >
      <DialogContent className="max-w-xl rounded-[28px] border-slate-200 p-0 overflow-hidden">
        <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">Secure Sign In</DialogTitle>
            <DialogDescription className="text-slate-300">
              South India users verify by email OTP. Other regions verify by mobile OTP.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          {step === "details" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="Full name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                <Input
                  placeholder="Email address"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="City"
                  value={form.city}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, city: event.target.value }))
                  }
                />
                <Input
                  placeholder="Mobile number"
                  value={form.mobileNumber}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      mobileNumber: event.target.value,
                    }))
                  }
                />
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                  value={form.state}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, state: event.target.value }))
                  }
                >
                  {ALL_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {locationNote ? (
                  <div className="mb-3 flex items-start gap-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                    <LocateFixed className="mt-0.5 h-4 w-4 text-sky-600" />
                    <p>{locationNote}</p>
                  </div>
                ) : null}
                {isSouth ? (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-sky-600" />
                    <p>
                      {form.state} is a South Indian state, so your OTP will be sent to your email.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <MessageSquareText className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <p>
                      {form.state} uses mobile OTP verification, so your OTP will be sent by SMS.
                    </p>
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleSendOtp}
                disabled={
                  loading ||
                  isDetectingLocation ||
                  !form.city ||
                  !form.email ||
                  !form.mobileNumber ||
                  !form.name ||
                  !form.state
                }
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Enter the OTP sent to your{" "}
                <strong>{deliveryChannel === "email" ? "email" : "mobile number"}</strong>.
              </div>

              <Input
                placeholder="Enter 6-digit OTP"
                value={form.otp}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, otp: event.target.value }))
                }
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("details")}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleVerifyOtp}
                  disabled={loading || form.otp.length < 6}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verify OTP
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
