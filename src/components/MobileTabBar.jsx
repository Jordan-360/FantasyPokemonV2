import './MobileTabBar.css'

const TABS = [
  {
    id: 'team',
    label: 'Team',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="12" y1="5" x2="12" y2="19" />
      </>
    ),
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
      </>
    ),
  },
  {
    id: 'standings',
    label: 'Standings',
    icon: (
      <>
        <line x1="6" y1="20" x2="6" y2="12" />
        <line x1="12" y1="20" x2="12" y2="6" />
        <line x1="18" y1="20" x2="18" y2="9" />
      </>
    ),
  },
  {
    id: 'fa',
    label: 'Free Agents',
    icon: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21c0-4 3-6 7-6" />
        <line x1="18" y1="13" x2="18" y2="21" />
        <line x1="14" y1="17" x2="22" y2="17" />
      </>
    ),
  },
]

// Only visible on phone-sized screens (see MobileTabBar.css)
export default function MobileTabBar({ active, onChange }) {
  return (
    <nav className="tab-bar" aria-label="Sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className="tab-bar__item"
          aria-current={active === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {tab.icon}
          </svg>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
