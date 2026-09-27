// Bankiersgrün design system (design-system/). The bundle is a classic script that reads React from
// window and assigns window.Bankiersgruen – ./ds-globals must be evaluated before it.
import './ds-globals';
import '../design-system/components/bundle.js';
import '../design-system/tokens.css';
import '../design-system/components/bundle.css';

export const DS = window.Bankiersgruen;
export const format = DS.format;
