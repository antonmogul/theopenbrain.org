# Open Brain: Interactive Digital Textbook Platform Proposal

## Project Overview

Open Brain is an innovative web platform that empowers professors to curate and customize digital textbooks while offering students an interactive learning experience. The platform seamlessly blends traditional textbook content with modern features, including AI-assisted learning, interactive code labs, and collaborative annotation tools. 

The project will build upon the first version, currently live at [theopenbrain.org](http://theopenbrain.org). The existing codebase will serve as the foundation for this project.

<aside>

## Scope & **Key Features**

- **Curate & Publish**: Professors select modules and instantly publish a customized URL for each course.

- **Interactive Learning**: Embed flashcards, quizzes, an AI assistant, and live Python code integration.

- **Collaborative Annotation**: Students highlight text, take notes, and see trending class highlights.

- **Scalable Roles & Security**: Three-tier auth (Creator, Professor, Student) via Supabase’s auth.

- **Improve overall UX & Mobile version:** Enhance user interface accessibility and responsiveness across all devices, with a focus on optimizing the mobile experience through adaptive layouts and touch-friendly controls.
   </aside>

### Authentication Roles

| **Role** | **Can Do** | 
|---|---|
| Creator | • Author/update master chapters | 
| • Define modules and metadata |  | 
| • Configure AI boundaries |  | 
| • Upload data sets and Python code |  | 
| • View data for Professors use & students |  | 
| • Release new versions (v1.0, v1.1…) |  | 
| Professor | • Log in → View Creator’s modules | 
| • Drag-select modules into “My Course” canvas |  | 
| • Embed quizzes/flashcards via UI |  | 
| • Publish a unique course URL |  | 
| • View student analytics (reads, quiz scores, lab runs) |  | 
| Student | • Log in → see full and “My Course” versions | 
| • Highlight & take notes (trending feed) |  | 
| • Use AI tutor inline for on-demand help |  | 
| • Complete flashcards/quizzes |  | 
| • Run & edit Python/data labs; “Clone to Git” |  | 

## Project breakdown

The project naturally divides into three distinct phases, each building upon the foundation laid by the previous phase. Throughout the development process, we will continuously improve and test the UX with real users whenever possible. 

<aside>

### Discovery & Research

The two-week Discovery & Research phase will focus on:

- Conduct a comprehensive UX audit of the current platform ([theopenbrain.org](http://theopenbrain.org))

- Research competitive platforms and identify innovative features that could enhance our offering

- Document user personas for three key stakeholders: content creators, professors, and students

- Conduct user interviews to understand pain points and desired features

- Define clear value propositions for each user type based on research findings

- Create a prioritized feature roadmap aligned with user needs

This phase will ensure we build features that truly matter to our users and set a strong foundation for the development phases.

</aside>

<aside>

### Phase 1: Core Backend & Creator Interface (Weeks 1-4)

This foundational phase establishes the basic infrastructure and creator tools:

- Implementation of Supabase backend and database schema

- Creator authentication and role management

- TipTap-based content editing interface

- Basic versioning system for content management

- Initial deployment of creator dashboard
   </aside>

<aside>

### Phase 2: Professor Curation Suite (Weeks 5-8)

Building on the creator infrastructure, this phase focuses on professor-specific features:

- Professor authentication and course management

- Drag-and-drop module curation interface

- Course URL generation and publishing system

- Quiz and flashcard creation tools

- Basic analytics dashboard for course tracking
   </aside>

<aside>

### Phase 3: Enhanced Student Experience (Weeks 9-12)

The final phase delivers advanced learning features for students:

- Student authentication and personalized dashboards

- Interactive highlighting and collaborative annotation system

- AI tutor integration and contextual assistance

- Python code labs with Git integration

- Advanced analytics and progress tracking
   </aside>

<aside>

### This phased approach ensures:

- Logical progression of feature development

- Early testing of core functionality

- Ability to gather feedback from creators and professors before student rollout

- Efficient resource allocation across the 12-week timeline

- Reduced risk through incremental deployment
   </aside>

## Technical Architecture & Features

<aside>

### **Frontend**

- Vue.js 3 + Vite

- TipTap rich text editor

- Tailwind CSS for styling
   </aside>

<aside>

### **Backend**

- Supabase (Backend-as-a-Service)

- PostgreSQL database

- Supabase Auth & Storage
   </aside>

<aside>

### Key Technical Benefits of Supabase

1. **Authentication**: Built-in authentication system supporting multiple providers

2. **Real-time capabilities**: Instant updates for collaborative editing

3. **Row-level security**: Precise access control at the data level

4. **Storage**: Built-in media file storage system

5. **Open Source**: Compatible with project's open source goals
   </aside>

<aside>

### **Feature Prioritization**

- Supabase Auth with 3 tiers

- Module management & metadata

- Professor "Curate & Publish" UI

- Student reader for full + curated editions

- TipTap inline text editor (Creator only)

- Flashcard builder & quizzing widget

- AI assistant pop-up (LLM integration)

- Highlighting/notes + trending feed

- In-browser Python notebook (Pyodide)

- "Clone to Git" code export

- Analytics dashboard (reads & scores)

- Versioning & release management
   </aside>

## Total Investment

<aside>
Below is a breakdown of the project investment across all three phases, including development costs, testing, and deployment:

**Phase 1 Investment: $15,000**

- Core backend development: $8,000

- Creator interface implementation: $6,000

- Testing and deployment: $1,000

**Phase 2 Investment: $15,000**

- Professor features development: $8,000

- Course management system: $4,000

- Testing and optimization: $1,000

**Phase 3 Investment: $11,000**

- Student interface development: $7,000

- AI and Python integration: $3,000

- Final testing and deployment: $1,000

**Total project investment: $41,000**

**Timeline: 12 weeks**

</aside>

<aside>

### Training & Onboarding

We will provide comprehensive training materials to ensure smooth adoption of the platform:

- Detailed documentation for each feature and user role

- Video tutorials demonstrating key workflows for creators, professors, and students

- Quick-start guides for essential features

- Best practices documentation for content creation and course management
   </aside>

<aside>

### Risk Mitigation

Key risks and mitigation strategies include:

- **Development Delays**: Our phased approachwith clear milestones allows for early identification and adjustment of timelines

- **User Adoption**: The Discovery & Research phaseensures we're building features that meet real user needs

- **Technical Issues**: Using established technologies like Supabaseand Vue.jsreduces technical risk

- **Data Security**: Implementation of row-level securityand robust authenticationprotects user data

- **Performance**: Regular testing throughout developmentensures optimal platform performance
   </aside>

<aside>

### Maintenance & Support

The current contract covers development through final deployment. The platform is designed to operate independently using reliable infrastructure through Supabase. Post-launch maintenance and support packages are available and can be discussed separately as needed.

To add these sections to the proposal, please select where you'd like them inserted and request the edit through the menu.

</aside>