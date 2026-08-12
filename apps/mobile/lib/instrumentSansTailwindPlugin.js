/** Map Tailwind weight utilities to Instrument Sans files (RN needs explicit families). */
module.exports = function instrumentSansTailwindPlugin({ addUtilities }) {
  addUtilities({
    '.font-sans': { fontFamily: 'InstrumentSans_400Regular' },
    '.font-normal': { fontFamily: 'InstrumentSans_400Regular', fontWeight: '400' },
    '.font-medium': { fontFamily: 'InstrumentSans_500Medium', fontWeight: '500' },
    '.font-semibold': { fontFamily: 'InstrumentSans_600SemiBold', fontWeight: '600' },
    '.font-bold': { fontFamily: 'InstrumentSans_700Bold', fontWeight: '700' },
  })
}
