/**
 * Feature flags derived from environment variables.
 * All flags are evaluated at import time so they work in both server and client
 * contexts (Next.js exposes NEXT_PUBLIC_* vars to the browser bundle).
 *
 * ENABLE_FEATURE_SICK_LEAVE — when "true", sick-leave features are visible:
 *   • The "Sick" type option appears in the Add / Edit leave form.
 *   • The sick-leave day count / tab appears in the Summary Card.
 *   • The "Sick" colour key appears in the calendar legend.
 * When unset or any other value, sick-leave UI is hidden and the form
 * defaults silently to "Holiday".
 */
export const SICK_LEAVE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FEATURE_SICK_LEAVE === "true";
