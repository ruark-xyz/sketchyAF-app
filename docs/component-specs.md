# SketchyAF Component Specifications

This document provides detailed specifications for key components of the SketchyAF marketing website.

## Navigation Component

```jsx
<Navbar>
  <Logo />
  <NavItems>
    <NavItem to="/">Home</NavItem>
    <NavItem to="/premium">Premium</NavItem>
    <NavItem to="/leaderboard">Leaderboard</NavItem>
    <NavItem to="/privacy">Privacy</NavItem>
    <NavItem to="/terms">Terms</NavItem>
  </NavItems>
  <MobileMenuButton />
  <MobileMenu /> {/* Shown only on mobile */}
</Navbar>
```

### Props & Behavior:
- Logo links to homepage
- Active page highlighted in navigation
- Mobile menu appears below 768px viewport width
- Smooth transitions for mobile menu open/close
- Optional transparency at top of page, becoming solid on scroll

---

## Hero Section Component

```jsx
<HeroSection>
  <AnimatedHeading>Snarky tagline goes here</AnimatedHeading>
  <SubHeading>Secondary message with game description</SubHeading>
  <CTAContainer>
    <PrimaryButton>Join a Game</PrimaryButton>
    <SecondaryButton>View Leaderboard</SecondaryButton>
  </CTAContainer>
  <BackgroundElement /> {/* Visual enhancement */}
</HeroSection>
```

### Animation Specs:
```jsx
// Framer Motion example for heading
<motion.h1
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  Snarky tagline goes here
</motion.h1>
```

---

## Email Signup Component

```jsx
<SignupForm>
  <FormHeading>Get notified when we launch</FormHeading>
  <FormGroup>
    <Input 
      type="email" 
      placeholder="Enter your email" 
      validation={emailValidation} 
    />
    <SubmitButton>Notify Me</SubmitButton>
  </FormGroup>
  <ValidationMessage /> {/* Shows success/error states */}
</SignupForm>
```

### Behavior Specs:
- Form validation with inline feedback
- Success animation on submission
- Error handling for invalid emails
- Loading state during submission

---

## Feature Highlight Component

```jsx
<FeatureGrid>
  <FeatureCard>
    <FeatureIcon icon="Pencil" />
    <FeatureTitle>Feature Name</FeatureTitle>
    <FeatureDescription>Feature description here</FeatureDescription>
  </FeatureCard>
  {/* Additional feature cards */}
</FeatureGrid>
```

### Animation Specs:
```jsx
// Staggered animation for feature cards
<motion.div
  variants={container}
  initial="hidden"
  animate="visible"
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
>
  {features.map((feature, index) => (
    <motion.div
      key={index}
      variants={item}
      className="feature-card"
    >
      {/* Feature content */}
    </motion.div>
  ))}
</motion.div>
```

---

## Premium Pricing Component

```jsx
<PricingSection>
  <PricingHeading>Become Premium AF</PricingHeading>
  <PricingCard>
    <PriceTag>$X.XX/month</PriceTag>
    <FeatureList>
      <FeatureItem>Premium feature 1</FeatureItem>
      <FeatureItem>Premium feature 2</FeatureItem>
      {/* Additional features */}
    </FeatureList>
    <PricingCTA>Get Premium</PricingCTA>
  </PricingCard>
</PricingSection>
```

---

## Booster Pack Grid Component

```jsx
<BoosterPackGrid>
  {packs.map(pack => (
    <BoosterPackCard 
      key={pack.id}
      name={pack.name}
      price={pack.price}
      type={pack.type} // Free/Paid/Premium
      onClick={() => openPackPreview(pack)}
    />
  ))}
  <PackPreviewModal
    isOpen={isModalOpen}
    onClose={closeModal}
    packData={selectedPack}
  />
</BoosterPackGrid>
```

---

## Leaderboard Component

```jsx
<LeaderboardTable>
  <LeaderboardHeader>
    <HeaderCell>Rank</HeaderCell>
    <HeaderCell>Username</HeaderCell>
    <HeaderCell>Score</HeaderCell>
  </LeaderboardHeader>
  <LeaderboardBody>
    {leaderboardData.map(entry => (
      <LeaderboardRow key={entry.id} highlight={isCurrentUser(entry.id)}>
        <Cell>{entry.rank}</Cell>
        <Cell>{entry.username}</Cell>
        <Cell>{entry.score}</Cell>
      </LeaderboardRow>
    ))}
  </LeaderboardBody>
</LeaderboardTable>
```

---

## Footer Component

```jsx
<Footer>
  <FooterSection title="Quick Links">
    <FooterLink to="/">Home</FooterLink>
    <FooterLink to="/premium">Premium</FooterLink>
    <FooterLink to="/leaderboard">Leaderboard</FooterLink>
  </FooterSection>
  <FooterSection title="Legal">
    <FooterLink to="/privacy">Privacy Policy</FooterLink>
    <FooterLink to="/terms">Terms of Service</FooterLink>
  </FooterSection>
  <FooterSection title="Connect">
    <SocialLinks /> {/* Social media icons */}
  </FooterSection>
  <Copyright>© 2025 SketchyAF. All rights reserved.</Copyright>
</Footer>
```

---

## Hackathon Banner Component

```jsx
<Banner isDismissible={true}>
  <BannerContent>
    Vote for us in the React Hackathon!
    <BannerLink href="#" target="_blank">Vote Now</BannerLink>
  </BannerContent>
  <DismissButton onClick={dismissBanner} />
</Banner>
```

### Behavior Specs:
- Fixed position at top of viewport
- Dismissible with local storage persistence
- Responsive text sizing
- Optional countdown timer functionality