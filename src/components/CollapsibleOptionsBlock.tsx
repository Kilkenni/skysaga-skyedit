import { Disclosure, DisclosureButton, DisclosurePanel, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { STRINGS } from '../i18n/strings';

const t = STRINGS.en;

interface Props {
  key: string, 
  enabled: boolean, 
  onToggle: React.ChangeEventHandler<HTMLInputElement>, 
  label: string, 
  optionsBody?: React.ReactNode
}

export default function CollapsibleOptionsBlock({key, enabled, onToggle, label, optionsBody}: Props) {
  return (
    <Popover as="div" key={key} style={{
      position: "relative", 
      display: "flex", 
      alignItems: "center", 
      gap: 2
    }} /*ref={isOpen ? popoverAnchorRef : null}*/ >
      {({ open }) => (
        
/* Use the `open` state to conditionally change things. */
        <>
          <label
            style={{
              fontSize: 12,
              display: "flex",
              gap: 4,
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <input type="checkbox" checked={enabled} onChange={onToggle} />
            {label}
          </label>
          <PopoverButton title={t.settings} style={{
            background: "transparent",
            border: "none",
            color: open ? "#6ea8fe" : "#8a91a3",
            cursor: "pointer",
            fontSize: 13,
            padding: "0 2px",
          }}>
              ⚙
          </PopoverButton>
          <PopoverPanel>
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 6,
              zIndex: 30,
              background: "#1a1d24",
              border: "1px solid #2a2f3a",
              borderRadius: 8,
              padding: 10,
              minWidth: 190,
              boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
            >
              {optionsBody}
            </div>
          </PopoverPanel>
        </>
      )}
    </Popover>
  )
}
