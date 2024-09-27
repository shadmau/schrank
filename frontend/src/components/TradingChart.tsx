import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  ColorType,
  UTCTimestamp,
} from 'lightweight-charts';

const TradingChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [currentInterval, setCurrentInterval] = useState<string>('1d');

  const intervals = ['1h', '4h', '1d', '7d'];

  const fetchData = async (collectionAddress: string, timeframe: string, from: number, to: number) => {
    const response = await fetch(`/api/price-data?collectionAddress=${collectionAddress}&timeframe=${timeframe}&from=${from}&to=${to}`);
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    return response.json();
  };
  const setChartInterval = async (interval: string) => {
    setCurrentInterval(interval);
    if (candleSeriesRef.current && chartRef.current) {
        const collectionAddress = '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'; // Example collection address
        const now = Math.floor(Date.now() / 1000); // Current time in seconds since epoch
        let from: number;
        let to: number;

        const startOfDayUTC = (date: Date) => {
            return Math.floor(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).getTime() / 1000);
        };

        const endOfDayUTC = (date: Date) => {
            return Math.floor(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59)).getTime() / 1000);
        };

        switch (interval) {
            case '1h':
                from = startOfDayUTC(new Date(now * 1000)) - 216 * 60 * 60; // Start of the day minus 3 hours
                to = endOfDayUTC(new Date(now * 1000)); // End of the current day
                break;
            case '4h':
                from = startOfDayUTC(new Date(now * 1000)) - 30 * 4 * 60 * 60; // Start of the day minus 12 hours
                to = endOfDayUTC(new Date(now * 1000)); // End of the current day
                break;
            case '1d':
                from = startOfDayUTC(new Date(now * 1000)) - 7 * 24 * 60 * 60; // Start of the day minus 3 days
                to = endOfDayUTC(new Date(now * 1000)); // End of the current day
                break;
            case '7d':
                from = startOfDayUTC(new Date(now * 1000)) - 7 * 24 * 60 * 60; // Start of the day minus 7 days
                to = endOfDayUTC(new Date(now * 1000)); // End of the current day
                break;
            default:
                return;
        }

        try {
            const data = await fetchData(collectionAddress, interval, from, to);
            candleSeriesRef.current.setData(data);
            const maData = calculateMovingAverage(data, 20);
            if (maSeriesRef.current) {
                maSeriesRef.current.setData(maData);
            }
        } catch (error) {
            console.error(error);
        }
    }
};

  const calculateMovingAverage = (data: CandlestickData<UTCTimestamp>[], period: number): LineData<UTCTimestamp>[] => {
    const maData: LineData<UTCTimestamp>[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        continue;
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
        maData.push({ time: data[i].time, value: sum / period });
      }
    }
    return maData;
  };

  useEffect(() => {
    if (chartContainerRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          textColor: '#d1d5db',
          background: { type: ColorType.Solid, color: '#111827' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 250,
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
          horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          ticksVisible: true,
        },
      });
      chartRef.current = chart;

      const maSeries = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
      });
      maSeriesRef.current = maSeries;

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });
      candleSeriesRef.current = candleSeries;

      setChartInterval('1d');

      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, []);

  return (
    <div>
      <div className="mb-2 flex space-x-1">
        {intervals.map((interval) => (
          <button
            key={interval}
            onClick={() => setChartInterval(interval)}
            className={`px-2 py-1 text-xs font-medium rounded 
              ${currentInterval === interval
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } transition-colors duration-150 ease-in-out`}
          >
            {interval.toUpperCase()}
          </button>
        ))}
      </div>
      <div ref={chartContainerRef} className="w-full h-[250px]" />
    </div>
  );
};

export default TradingChart;