'use client';

import { useTranslations } from 'next-intl';
import type { MockTemplate } from '@/types/dashboard';

interface TemplateCardProps {
  template: MockTemplate;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const t = useTranslations('dashboard');

  return (
    <div className="group cursor-pointer">
      <div className="border border-gray-200 rounded-xl overflow-hidden aspect-[1/1.414] relative shadow-sm group-hover:shadow-lg transition-all duration-300 mb-4">
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-md text-[12px] font-bold text-gray-800 shadow-sm z-10 border border-gray-100">
          {t('free')}
        </div>

        <TemplateCardContent style={template.style} title={template.title} />

        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-medium shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
            {t('useTemplate')}
          </div>
        </div>
      </div>
      <h3 className="font-medium text-[15px] text-gray-900 group-hover:text-primary transition-colors text-center px-2 line-clamp-2">
        {template.title}
      </h3>
    </div>
  );
}

function TemplateCardContent({ style, title }: { style: MockTemplate['style']; title: string }) {
  switch (style) {
    case 'white-logo':
      return (
        <div className="w-full h-full p-6 flex flex-col justify-center items-center text-center relative bg-white">
          <div className="w-16 h-16 bg-black rounded-full text-white flex items-center justify-center font-bold text-sm mb-10 leading-tight">YOUR<br />LOGO</div>
          <h3 className="font-bold text-[22px] mb-4 leading-tight text-gray-900">{title.replace(/ /g, '<br />')}</h3>
          <div className="text-[10px] text-gray-400 mt-auto leading-tight">Prepared by:<br />[Your Name]</div>
        </div>
      );

    case 'brown-arch':
      return (
        <div className="w-full h-full flex flex-col relative bg-[#D4A373]">
          <div className="h-20 bg-white w-14 mx-auto rounded-b-lg flex items-end justify-center pb-3 shadow-sm">
            <span className="font-bold text-xl text-gray-800">T.</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <h3 className="font-bold text-[28px] text-[#4A3728] leading-none uppercase tracking-wide">{title.replace(/ /g, '<br />')}</h3>
          </div>
        </div>
      );

    case 'light-typography':
      return (
        <div className="w-full h-full relative bg-white">
          <div className="absolute top-16 left-8 w-14 h-14 bg-black flex items-center justify-center text-white font-bold text-2xl">T.</div>
          <div className="absolute top-20 right-0 w-[55%] h-1 bg-blue-100" />
          <div className="absolute top-36 left-8 text-[10px] text-gray-400 tracking-widest font-medium">WWW.aiformatter.net</div>
          <div className="absolute bottom-16 left-8 right-8">
            <h3 className="font-light text-[32px] text-gray-800 leading-[1.1] uppercase tracking-wider">Sample<br /><span className="font-bold">{title.replace('Sample ', '').replace(/ /g, '<br />')}</span></h3>
          </div>
        </div>
      );

    case 'dark-border':
      return (
        <div className="w-full h-full relative text-white bg-[#24272D]">
          <div className="absolute top-12 left-8 w-12 h-12 border-[3px] border-white flex items-center justify-center font-bold text-2xl">T.</div>
          <div className="absolute bottom-24 left-8 right-8">
            <h3 className="font-bold text-[36px] leading-[1.1] uppercase tracking-wider">{title.replace(/ /g, '<br />')}</h3>
          </div>
          <div className="absolute bottom-10 left-8 right-8 h-1 bg-gray-500 w-16" />
        </div>
      );

    case 'double-frame':
      return (
        <div className="w-full h-full relative flex flex-col p-8 bg-white">
          <div className="flex justify-end mb-20">
            <div className="w-10 h-10 border-[3px] border-black flex items-center justify-center text-sm font-bold relative">
              <div className="absolute w-full h-full border-[3px] border-gray-300 -top-2.5 -left-2.5" />
              T
            </div>
          </div>
          <div className="text-right text-[10px] text-gray-400 mb-auto tracking-wide">aiformatter.net</div>
          <div className="mt-16">
            <h3 className="font-light text-[26px] text-gray-800 leading-[1.1] tracking-[0.2em] uppercase">
              Strategic<br /><span className="font-bold">{title.replace('Strategic ', '').replace(/ /g, '<br />')}</span>
            </h3>
          </div>
        </div>
      );

    case 'gradient-blue':
      return (
        <div className="w-full h-full relative text-white p-6 flex flex-col bg-gradient-to-br from-indigo-900 to-blue-900">
          <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center mb-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-bold text-[28px] leading-tight mb-2">{title.replace(' Tech', '<br />TECH').replace(' Plan', '').toUpperCase()}</h3>
          <p className="text-blue-200 text-xs tracking-wider">BUSINESS PLAN 2026</p>
        </div>
      );

    case 'green-curve':
      return (
        <div className="w-full h-full relative flex flex-col bg-white">
          <div className="h-[40%] bg-emerald-500 w-full rounded-b-[40px] flex items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg translate-y-8">
              <span className="font-bold text-emerald-500 text-xl">AG</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-4">
            <h3 className="font-bold text-[22px] text-gray-900 leading-tight">{title.replace('Modern ', '').replace(/ /g, '<br />')}</h3>
            <div className="w-8 h-1 bg-emerald-500 mt-4" />
          </div>
        </div>
      );

    case 'minimal-retail':
      return (
        <div className="w-full h-full relative p-8 border-[8px] border-white flex flex-col justify-between bg-[#F4F4F4]">
          <div className="text-right">
            <span className="text-[10px] font-bold tracking-widest text-gray-500">EST. 2026</span>
          </div>
          <div>
            <h3 className="font-serif text-[32px] text-gray-800 leading-[1.1] mb-4">Retail<br />Business<br />Plan.</h3>
            <p className="text-[9px] text-gray-500 leading-relaxed">A comprehensive guide to launching your retail storefront successfully.</p>
          </div>
        </div>
      );

    case 'red-bold':
      return (
        <div className="w-full h-full relative text-white p-6 flex flex-col items-center justify-center text-center bg-[#FF4B4B]">
          <div className="w-16 h-16 border-4 border-white rounded-full flex items-center justify-center mb-8">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="font-black text-[28px] leading-[1.1] tracking-tight mb-2">E-COMMERCE</h3>
          <div className="bg-white text-[#FF4B4B] px-3 py-1 text-[10px] font-bold tracking-widest mt-2">BUSINESS PLAN</div>
        </div>
      );

    case 'image-top':
    default:
      return (
        <div className="w-full h-full relative p-6 flex flex-col bg-white">
          <div className="w-full h-[45%] bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="font-bold text-[20px] text-gray-900 leading-tight mb-2">{title.replace(' Plan', '<br />Development Plan')}</h3>
          <p className="text-[10px] text-gray-500 mt-auto">aiformatter.net Originals</p>
        </div>
      );
  }
}
