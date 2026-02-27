'use client';

import { cn } from '@/lib/utils';
import React from 'react';

// This is a decorative component and does not generate a real, scannable QR code.
// It uses a pseudo-random pattern based on the input string to look like a QR code.

const useDeterministicRandom = (seed: string) => {
  return React.useMemo(() => {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }, [seed]);
};

export const QrCode = ({ value, className }: { value: string, className?: string }) => {
  const random = useDeterministicRandom(value);
  const size = 21; // QR code version 1 size

  const modules = React.useMemo(() => {
    const grid = Array.from({ length: size }, () => Array(size).fill(false));
    
    // Generate pseudo-random pattern
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        grid[y][x] = random() % 2 === 0;
      }
    }
    
    // Add finder patterns (the squares in the corners)
    const placeFinderPattern = (x: number, y: number) => {
      for (let i = -3; i <= 3; i++) {
        for (let j = -3; j <= 3; j++) {
          if (x + i >= 0 && x + i < size && y + j >= 0 && y + j < size) {
            const isBorder = Math.abs(i) === 3 || Math.abs(j) === 3;
            const isInner = Math.abs(i) < 2 && Math.abs(j) < 2;
            grid[y + j][x + i] = isBorder || isInner;
          }
        }
      }
       for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
           if (x + i >= 0 && x + i < size && y + j >= 0 && y + j < size) {
             const isMiddle = Math.abs(i) < 2 && Math.abs(j) < 2;
             if(!isMiddle) grid[y + j][x + i] = false;
           }
        }
       }
    };
    
    placeFinderPattern(3, 3);
    placeFinderPattern(size - 4, 3);
    placeFinderPattern(3, size - 4);
    
    return grid;
  }, [random]);

  return (
    <div className={cn("grid aspect-square w-full grid-cols-21", className)} style={{ gridTemplateColumns: `repeat(${size}, 1fr)`}}>
      {modules.flat().map((isDark, index) => (
        <div key={index} className={cn(isDark ? 'bg-foreground' : 'bg-transparent')} />
      ))}
    </div>
  );
};
