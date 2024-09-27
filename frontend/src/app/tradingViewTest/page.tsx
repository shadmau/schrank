'use client';

import React from 'react';
import TradingChart from '@/components/TradingChart';
import { Button } from "@/components/ui/button";

const TestTradingChartPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-4">
      <h1 className="text-2xl font-bold text-white mb-4">TradingView Chart Test</h1>
      <div className="w-full max-w-4xl bg-gray-800 p-4 rounded shadow">
        <TradingChart />
      </div>
      <Button
        onClick={() => {
          console.log('Button Clicked!');
        }}
        className="mt-4"
      >
        Test Button
      </Button>
    </div>
  );
};

export default TestTradingChartPage;
