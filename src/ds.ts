// Bankiersgrün design system. The vendored bundle is a classic script that reads React from
// window and assigns window.Bankiersgruen – ./ds-globals must be evaluated before it.
import './ds-globals';
import '../vendor/bankiersgruen/bundle.js';
import '../vendor/bankiersgruen/tokens.css';
import '../vendor/bankiersgruen/bundle.css';

export const DS = window.Bankiersgruen;
export const format = DS.format;
