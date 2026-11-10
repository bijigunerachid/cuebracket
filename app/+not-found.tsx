import React from 'react';
import { router } from 'expo-router';
import { Btn, Page } from '../src/ui';

export default function NotFound() {
  return (
    <Page title="Page Not Found" subtitle="This link is unavailable.">
      <Btn title="All Tournaments" onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
