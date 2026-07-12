import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSubmitRegistration, useGetCount } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Building2, Users, Trophy } from "lucide-react";

const WHATSAPP_URL =
  "https://chat.whatsapp.com/JsKmQMpECJMHyxucHquF15?s=cl&p=a&mlu=0&amv=1";

/** Normalise user input to E.164: strip spaces + leading +, then re-add + */
function normalizePhone(raw: string): string {
  return "+" + raw.replace(/\s+/g, "").replace(/^\+/, "");
}

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z
    .string()
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      "Enter your number with country code, no spaces (e.g. 254712345678)"
    ),
});

export default function Home() {
  const { toast } = useToast();
  const submitRegistration = useSubmitRegistration();

  const { data: countData, refetch: refetchCount } = useGetCount({
    query: { refetchInterval: 20000 },
  });

  const count = countData?.count ?? 0;
  const target = countData?.target ?? 500;
  const progress = Math.min((count / target) * 100, 100);
  const targetReached = count >= target;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", phone: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const phone = normalizePhone(values.phone);

    submitRegistration.mutate(
      { data: { name: values.name, phone } },
      {
        onSuccess: () => {
          refetchCount();
          window.location.href = WHATSAPP_URL;
        },
        onError: (error) => {
          if (error.status === 409) {
            form.setError("phone", {
              type: "manual",
              message: "This phone number is already registered.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Registration Failed",
              description:
                error.data?.message ||
                "An unexpected error occurred. Please try again.",
            });
          }
        },
      }
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-5">
        {/* Header */}
        <div className="text-center flex flex-col items-center mb-2">
          <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-2xl mb-4 border border-primary/20 shadow-lg shadow-primary/5">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Nutterx Technologies
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">VCF Registration</p>
        </div>

        {/* Progress Card */}
        <Card className="border-white/10 bg-card/50 backdrop-blur-xl shadow-xl overflow-hidden">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="w-4 h-4 text-primary" />
                Community Progress
              </div>
              <div className="text-sm font-mono font-bold text-primary">
                {count.toLocaleString()} / {target.toLocaleString()}
              </div>
            </div>

            <Progress value={progress} className="h-3 rounded-full bg-white/5" />

            <div className="mt-3 text-center">
              {targetReached ? (
                <p className="text-sm font-medium text-green-400 flex items-center justify-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  Goal reached! VCF download is now unlocked.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {(target - count).toLocaleString()}
                  </span>{" "}
                  more {target - count === 1 ? "registration" : "registrations"} to
                  unlock the VCF download
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* VCF Download — unlocked when target reached */}
        {targetReached && (
          <Button
            asChild
            size="lg"
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30 gap-2 animate-in fade-in duration-500"
          >
            <a href="/api/download-vcf" download="NUTTERX.vcf">
              <Download className="h-5 w-5" />
              Download NUTTERX.vcf
            </a>
          </Button>
        )}

        {/* Registration Form */}
        <Card className="border-white/10 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Join the Network</CardTitle>
            <CardDescription>
              Register your phone number to join our WhatsApp community and unlock the
              contact card.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          className="bg-background/50 h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="254712345678"
                          inputMode="numeric"
                          className="bg-background/50 h-11"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Include country code, no spaces or + sign (e.g. 254712345678)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={submitRegistration.isPending}
                >
                  {submitRegistration.isPending ? "Registering..." : "Register & Join"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground pb-2">
          © {new Date().getFullYear()} Nutterx Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
