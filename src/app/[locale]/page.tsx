import { setRequestLocale } from 'next-intl/server';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { IntroSection } from '@/components/landing/IntroSection';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { WorkSmarter } from '@/components/landing/WorkSmarter';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <HeroSection />
        <IntroSection />
        <FeaturesGrid />
        <HowItWorks />
        <WorkSmarter />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
