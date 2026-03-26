import { useTranslations } from 'next-intl';

export function HowItWorks() {
  const t = useTranslations('landing.howItWorks');
  const steps = t.raw('steps') as { title: string; description: string }[];

  return (
    <section className="bg-gray-50 border-y border-gray-200 py-20">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-16">{t('title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left relative">
          <div className="hidden md:block absolute top-6 left-[16%] right-[16%] h-0.5 bg-gray-200 z-0" />

          {steps.map((step, i) => (
            <div key={step.title} className="relative z-10">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mb-6 mx-auto md:mx-0 shadow-lg cursor-pointer hover:scale-110 transition-transform">
                {i + 1}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center md:text-left">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed text-center md:text-left">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
