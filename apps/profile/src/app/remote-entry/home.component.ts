import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.component.scss',
  template: `
    <!-- Hero -->
    <section class="profile-hero text-center text-white position-relative overflow-hidden">
      <div class="container py-5 position-relative" style="z-index:1">
        <div class="avatar-ring mx-auto mb-3">
          <img
            src="/images/me.jpg"
            alt="Hemant Kumar Singh"
            class="rounded-circle"
            width="140"
            height="140"
          />
        </div>
        <h1 class="fw-bold mb-1">Hemant Kumar Singh</h1>
        <p class="fs-5 hero-subtitle mb-2">Full Stack Architect</p>
        <p class="small opacity-60 mb-4">
          <i class="icon-location-pin me-1"></i>Hyderabad, India
        </p>
        <div class="d-flex justify-content-center gap-2 flex-wrap">
          <a
            href="mailto:hemant.ajax&#64;gmail.com"
            class="btn btn-sm btn-hero-link rounded-pill px-3"
          >
            <i class="icon-email me-1"></i>Email
          </a>
          <a
            href="https://linkedin.com/in/hkajax/"
            target="_blank"
            rel="noopener"
            class="btn btn-sm btn-hero-link rounded-pill px-3"
          >
            <i class="icon-linkedin me-1"></i>LinkedIn
          </a>
          <a
            href="https://github.com/hs2504785"
            target="_blank"
            rel="noopener"
            class="btn btn-sm btn-hero-link rounded-pill px-3"
          >
            <i class="icon-github me-1"></i>GitHub
          </a>
          <a
            href="https://hs950559.github.io/portfolio/"
            target="_blank"
            rel="noopener"
            class="btn btn-sm btn-hero-link rounded-pill px-3"
          >
            <i class="icon-link me-1"></i>Portfolio
          </a>
        </div>
      </div>
    </section>

    <!-- About -->
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <h2 class="section-title">About</h2>
          <p class="text-muted lh-lg fs-6">
            Software engineer who loves building scalable web applications
            end-to-end. I work across the full stack — from architecting
            Angular &amp; React frontends to designing REST APIs with
            Node.js/NestJS and optimizing MongoDB data layers. Passionate
            about micro-frontend architectures, developer productivity,
            and shipping clean, performant code.
          </p>
        </div>
      </div>
    </section>

    <!-- Expertise -->
    <section class="bg-body-tertiary py-5">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <h2 class="section-title">Expertise</h2>
            <div class="row g-4">
              @for (area of expertise; track area.title) {
                <div class="col-sm-6">
                  <div class="card h-100 border-0 shadow-sm">
                    <div class="card-body">
                      <div class="d-flex align-items-center mb-2">
                        <i class="{{ area.icon }} fs-5 text-primary me-2"></i>
                        <h3 class="h6 fw-semibold mb-0">{{ area.title }}</h3>
                      </div>
                      <p class="small text-muted mb-0">{{ area.desc }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech -->
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <h2 class="section-title">Tech Stack</h2>
          <div class="d-flex flex-wrap gap-2">
            @for (tech of techStack; track tech) {
              <span class="badge rounded-pill text-bg-light border px-3 py-2">
                {{ tech }}
              </span>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- Highlights -->
    <section class="bg-body-tertiary py-5">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <h2 class="section-title">Career Highlights</h2>
            @for (item of highlights; track item.company) {
              <div class="d-flex mb-4">
                <div class="timeline-dot bg-primary rounded-circle mt-1 me-3 flex-shrink-0"></div>
                <div>
                  <h3 class="h6 fw-semibold mb-0">{{ item.role }}</h3>
                  <p class="small text-primary mb-1">{{ item.company }}</p>
                  <p class="small text-muted mb-0">{{ item.summary }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- Education -->
    <section class="container py-5">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <h2 class="section-title">Education</h2>
          <p class="mb-0">
            <strong>B.Tech — Computer Science Engineering</strong>
          </p>
          <p class="text-muted small">UPTU · 2003 – 2007</p>
        </div>
      </div>
    </section>
  `,
})
export class HomeComponent {
  protected readonly expertise = [
    {
      icon: 'icon-layout-grid2',
      title: 'Frontend Architecture',
      desc: 'Angular, React, TypeScript, micro-frontends, design systems & component libraries.',
    },
    {
      icon: 'icon-server',
      title: 'Backend & APIs',
      desc: 'Node.js, NestJS, Express, REST API design, MongoDB, JWT auth.',
    },
    {
      icon: 'icon-cloud',
      title: 'Cloud & DevOps',
      desc: 'AWS, Azure DevOps, Docker, Kubernetes, CI/CD pipelines, GitHub Actions.',
    },
    {
      icon: 'icon-rocket',
      title: 'Performance & Scale',
      desc: 'Optimization, lazy loading, state management, modular monorepos.',
    },
  ];

  protected readonly techStack = [
    'Angular',
    'React',
    'TypeScript',
    'Node.js',
    'NestJS',
    'MongoDB',
    'NgRx',
    'Redux',
    'Bootstrap',
    'Tailwind',
    'Docker',
    'Kubernetes',
    'AWS',
    'Azure DevOps',
    'GitHub Actions',
    'Webpack',
  ];

  protected readonly highlights = [
    {
      role: 'Full Stack Architect',
      company: 'Kore.ai',
      summary:
        'Leading architecture for AI-driven platforms — Angular/React frontends, NestJS APIs, MongoDB, Azure DevOps.',
    },
    {
      role: 'Domain Architect',
      company: 'GlobalLogic · Mars Petcare',
      summary:
        'Designed domain-level architecture across veterinary PMS products. MEAN stack, AWS deployments.',
    },
    {
      role: 'Member of Technical Staff',
      company: 'Oracle',
      summary:
        'Built enterprise-grade Log Analytics platform with Angular, Oracle JET, and RESTful APIs.',
    },
    {
      role: 'UI Consultant',
      company: 'Microsoft',
      summary:
        'Architected SPAs across multiple products using AngularJS, KnockoutJS, and .NET integrations.',
    },
  ];
}
