'use client';
import { useState } from 'react';
import { Ruler, X } from 'lucide-react';

const SIZE_DATA = [
  { size: 'XS', us: '0', uk: '4', eu: '32', china: '-', chest: '78 - 80', waist: '60 - 62', hips: '84 - 86' },
  { size: 'S', us: '2', uk: '6', eu: '34', china: 'Small', chest: '81 - 83', waist: '63 - 65', hips: '87 - 89' },
  { size: 'S', us: '4', uk: '8', eu: '36', china: 'Medium', chest: '84 - 86', waist: '66 - 68', hips: '90 - 92' },
  { size: 'M', us: '6', uk: '10', eu: '38', china: 'Large', chest: '87 - 89', waist: '69 - 71', hips: '93 - 95' },
  { size: 'M', us: '8', uk: '12', eu: '40', china: 'XL', chest: '90 - 93', waist: '72 - 75', hips: '96 - 99' },
  { size: 'L', us: '10', uk: '14', eu: '42', china: 'XXL', chest: '94 - 98', waist: '76 - 80', hips: '100 - 104' },
  { size: 'L', us: '12', uk: '16', eu: '44', china: 'XXXL', chest: '99 - 103', waist: '81 - 85', hips: '105 - 109' },
  { size: 'XL', us: '14', uk: '18', eu: '46', china: '4XL', chest: '104 - 108', waist: '86 - 90', hips: '110 - 114' },
  { size: 'XL', us: '16', uk: '20', eu: '48', china: '5XL', chest: '109 - 114', waist: '91 - 96', hips: '115 - 120' },
  { size: '2XL', us: '18', uk: '22', eu: '50', china: '-', chest: '115 - 120', waist: '97 - 102', hips: '121 - 125' },
  { size: '2XL', us: '20', uk: '24', eu: '52', china: '-', chest: '121 - 126', waist: '103 - 108', hips: '126 - 132' },
  { size: '3XL', us: '22', uk: '26', eu: '54', china: '-', chest: '127 - 132', waist: '109 - 114', hips: '133 - 138' },
  { size: '3XL', us: '24', uk: '28', eu: '56', china: '-', chest: '133 - 139', waist: '115 - 121', hips: '139 - 145' },
  { size: '4XL', us: '26', uk: '30', eu: '58', china: '-', chest: '140 - 146', waist: '122 - 128', hips: '146 - 152' },
];

export function SizeGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-charcoal/60 hover:text-indigo underline decoration-charcoal/30"
      >
        <Ruler size={12} aria-hidden /> Size Guide
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div 
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded bg-cream p-6 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="headline text-2xl text-indigo">Size Guide</h2>
              <button onClick={() => setOpen(false)} className="text-charcoal/50 hover:text-rose" aria-label="Close size guide">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-charcoal text-charcoal">
                    <th className="py-2 pr-4 font-semibold">Size</th>
                    <th className="py-2 pr-4 font-semibold">US</th>
                    <th className="py-2 pr-4 font-semibold">UK</th>
                    <th className="py-2 pr-4 font-semibold">EU</th>
                    <th className="py-2 pr-4 font-semibold">China</th>
                    <th className="py-2 pr-4 font-semibold">Chest (cm)</th>
                    <th className="py-2 pr-4 font-semibold">Waist (cm)</th>
                    <th className="py-2 font-semibold">Hips (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand/40">
                  {SIZE_DATA.map((row, i) => (
                    <tr key={i} className="hover:bg-sand/10 text-charcoal/80">
                      <td className="py-2 pr-4 font-medium">{row.size}</td>
                      <td className="py-2 pr-4">{row.us}</td>
                      <td className="py-2 pr-4">{row.uk}</td>
                      <td className="py-2 pr-4">{row.eu}</td>
                      <td className="py-2 pr-4">{row.china}</td>
                      <td className="py-2 pr-4">{row.chest}</td>
                      <td className="py-2 pr-4">{row.waist}</td>
                      <td className="py-2">{row.hips}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-charcoal/50 italic">
              * Measurements are for guidance. If you are between sizes, we recommend sizing up.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
