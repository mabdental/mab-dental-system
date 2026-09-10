import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [...nextVitals, { rules: {
  'react-hooks/set-state-in-effect': 'off',
  'react-hooks/exhaustive-deps': 'off',
  'react/no-unescaped-entities': 'off'
} }]

export default config
