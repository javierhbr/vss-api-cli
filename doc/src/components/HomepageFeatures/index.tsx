import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="col col--12">
            <div className={clsx('text--left', styles.featureContent)}>
            <p>
              Want to speed up setting up new API projects with Hexagonal Architecture? Check out <strong>VSS-API-CLI</strong>! ✨
            </p>
            <p>
              It's a CLI tool to quickly scaffold components like domains, handlers, ports, and services, ensuring a consistent structure based on clean architecture principles.
            </p>
            <h3>Key Commands:</h3>
            <ul>
              <li><code>create:domain</code> (<code>cd</code>): Generates a full domain structure (models, services, ports).</li>
              <li><code>create:handler</code> (<code>ch</code>): Creates API handlers (e.g., Lambdas) with optional Zod schema validation.</li>
              <li><code>create:port</code> (<code>cp</code>): Generates port interfaces and adapter implementations.</li>
              <li><code>create:service</code> (<code>cs</code>): Creates domain service classes.</li>
            </ul>
            <h3>Why use it?</h3>
            <ul>
              <li>🚀 Faster setup</li>
              <li>📐 Consistency across projects</li>
              <li>🤖 Reduces boilerplate code</li>
            </ul>
            <h3>Install:</h3>
            <pre>
              <code>
      {`# Local install (recommended)
      npm install --save-dev vss-api-cli

      # Global install
      npm install -g vss-api-cli`}
              </code>
            </pre>
            </div>
        </div>
      </div>
    </section>
  );
}
