import AnimatedOTP from '@/components/ui/animated-otp';

export default function AnimatedOTPExample() {
  return (
    <AnimatedOTP
      delay={3500} // Time interval (in ms) after which the OTP animation resets.
      cardTitle="Secure Access"
      cardDescription="Protect accounts with a one-time password, auto-applied during every user login for enhanced security."
    />
  );
}
