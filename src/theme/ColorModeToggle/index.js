import useIsBrowser from '@docusaurus/useIsBrowser';

/**
 * Render the color mode toggle as a sliding switch with a sun or moon on the knob.
 *
 * @param props - Props passed by the navbar.
 * @param props.className - Class name for the switch.
 * @param props.value - Current color mode, `'light'` or `'dark'`.
 * @param props.onChange - Called with the new color mode.
 * @returns The switch button.
 */
export default function ColorModeToggle({className, value, onChange}) {
  const isBrowser = useIsBrowser();
  const dark = value === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title="Dark mode"
      className={`zices-theme-switch ${className ?? ''}`}
      disabled={!isBrowser}
      onClick={() => onChange(dark ? 'light' : 'dark')}>
      <span className="zices-theme-switch__knob" aria-hidden="true">
        <svg className="zices-theme-switch__sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg className="zices-theme-switch__moon" viewBox="0 0 24 24">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </span>
    </button>
  );
}
