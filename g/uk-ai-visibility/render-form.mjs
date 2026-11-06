/** The application form as HTML, from the shared renderer with this funnel's questions. */
import * as core from './core.mjs';
import { makeRenderForm } from '../_growth/render-form.mjs';

export const renderForm = makeRenderForm(core);
