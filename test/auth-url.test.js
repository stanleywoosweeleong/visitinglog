import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signInRedirect} from '../src/auth-url.js';

test('email sign-in returns to the GitHub Pages project path', () => {
  assert.equal(signInRedirect('https://stanleywoosweeleong.github.io/visitinglog/?visit=123#temporary'), 'https://stanleywoosweeleong.github.io/visitinglog/');
  assert.equal(signInRedirect('http://127.0.0.1:4173/'), 'http://127.0.0.1:4173/');
});
