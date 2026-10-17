// The dictionary's shape — every locale (including this one) is typed
// against this explicitly, rather than derived via `typeof en`, so a
// translation's string content doesn't get pinned to English's literal
// values. `si.ts` (and any future locale) implementing this interface means
// adding a key here without a matching entry there is a compile error, not
// a silently missing string.
//
// Namespaced by screen/feature, mirroring the 21-screen Claude Design
// corpus; `common` holds copy shared across screens (button labels, generic
// confirmations) rather than being tied to one of them.
//
// This is a first content pass — real copy, but not yet reviewed by a
// native Sinhala speaker (tracked as its own pre-launch task in the
// Confluence plan's risk register). Dynamic values (counts, prices, names)
// are deliberately not in here — components interpolate those at the call
// site; a dictionary entry is only ever the static label around them.
export interface Dictionary {
  common: {
    continue: string
    cancel: string
    save: string
    delete: string
    notNow: string
    search: string
    back: string
    next: string
    done: string
    retry: string
    loading: string
    genericError: string
    optional: string
    reset: string
    send: string
    close: string
  }
  auth: {
    signIn: {
      title: string
      subtitle: string
      /** "Mobile number" mode-switch tab label. */
      mobileMode: string
      /** "Email" mode-switch tab label — deliberately shorter than `emailFieldLabel`, matching the mockup's own tab-vs-field-label distinction. */
      emailMode: string
      /** Uppercased via `TextField`'s label style — not a separate all-caps string. */
      mobileFieldLabel: string
      emailFieldLabel: string
      emailLabel: string
      emailPlaceholder: string
      passwordLabel: string
      passwordPlaceholder: string
      rememberMe: string
      forgotPassword: string
      orContinueWith: string
      submit: string
      noAccount: string
      signUpLink: string
    }
    signUp: {
      title: string
      subtitle: string
      nameLabel: string
      namePlaceholder: string
      mobileLabel: string
      emailLabel: string
      emailPlaceholder: string
      passwordLabel: string
      passwordPlaceholder: string
      submit: string
      hasAccount: string
      signInLink: string
      termsNotice: string
      /** Contains a literal `{{tradingTerms}}` marker — split on it to render `tradingTerms` as a separately styled inline span. */
      termsAgreement: string
      tradingTerms: string
    }
    forgotPassword: {
      /** Nav-row header title — "Forgot Password", distinct from the body `title` below. */
      navTitle: string
      title: string
      subtitle: string
      channelMobileTitle: string
      channelMobileHint: string
      channelEmailTitle: string
      channelEmailHint: string
      mobileLabel: string
      emailLabel: string
      emailPlaceholder: string
      submit: string
      safetyNote: string
      rememberedIt: string
      signIn: string
    }
    resetPassword: {
      title: string
      subtitle: string
      codeLabel: string
      codePlaceholder: string
      newPasswordLabel: string
      confirmPasswordLabel: string
      submit: string
      success: string
    }
    verifyPhone: {
      /** Nav-row header title — short form ("Verification"), distinct from the body `title` below. */
      navTitle: string
      title: string
      subtitle: string
      resendPrompt: string
      resendCode: string
      resendIn: string
      statusExpires: string
      statusReadyToConfirm: string
      statusVerified: string
      submit: string
      verified: string
      /** Shown instead of the code-entry UI when the account has no phone number at all yet. */
      noPhoneTitle: string
      noPhoneSubtitle: string
      addPhoneButton: string
    }
    verifyEmail: {
      /** Nav-row header title — "Verify Email", distinct from the body `title` below. */
      navTitle: string
      title: string
      /** Precedes the bold email address inline. */
      subtitle: string
      resendPrompt: string
      resendCode: string
      resendIn: string
      statusExpires: string
      statusReadyToConfirm: string
      statusVerified: string
      submit: string
      verified: string
      wrongAddress: string
      changeEmail: string
    }
  }
  home: {
    searchPlaceholder: string
    featuredTitle: string
    categoriesTitle: string
    gemsTab: string
    equipmentTab: string
    viewAll: string
    /** Time-of-day header greeting — `useGreeting` in the Home screen picks one based on the current hour. */
    greetingMorning: string
    greetingAfternoon: string
    greetingEvening: string
    filtersTitle: string
    /** Uppercased via the same label style as `TextField` — not a separate all-caps string. */
    maxPriceLabel: string
    /** Contains a literal `{{count}}` marker — replaced with the live result count at the call site. */
    showResultsCount: string
  }
  listingDetail: {
    priceOnRequest: string
    contactSeller: string
    whatsapp: string
    call: string
    chat: string
    callSeller: string
    callNotSupported: string
    revealPhone: string
    reportListing: string
    blockSeller: string
    similarListings: string
    viewAll: string
    priceLabel: string
    aboutTab: string
    specsTab: string
    sellerTab: string
    recentlyViewed: string
    certificate: string
    treatment: string
    origin: string
    weight: string
    dimensions: string
    shape: string
    color: string
    clarity: string
    soldBadge: string
  }
  chat: {
    presenceOnline: string
    presenceTyping: string
    today: string
    safetyNotice: string
    yourOffer: string
    /** Contains a literal `{{price}}` marker — the listing's price is interpolated at the call site. */
    listedAt: string
    offerAccepted: string
    offerPending: string
    /** Contains a literal `{{name}}` marker — the seller's name is interpolated at the call site. */
    composerPlaceholder: string
    autoReply: string
    quickBookViewing: string
    quickRequestVideo: string
    quickNegotiable: string
    seen: string
    moreOptions: string
    reportTitle: string
    reportReasonCounterfeit: string
    reportReasonMisleading: string
    reportReasonProhibitedItem: string
    reportReasonScam: string
    reportReasonOther: string
    reportDetailsPlaceholder: string
    reportSubmit: string
    reportSuccessTitle: string
    reportSuccessMessage: string
    unblockSeller: string
    blockConfirmTitle: string
    blockConfirmMessage: string
    blockConfirmButton: string
    unblockConfirmTitle: string
    unblockConfirmMessage: string
    unblockConfirmButton: string
  }
  sellerProfile: {
    title: string
    shareLabel: string
    coverPhotoLabel: string
    galleryTitle: string
    chatWithSeller: string
    chat: string
    directions: string
    noListings: string
    searchInPrefix: string
    allChipLabel: string
    stonesSuffix: string
    reviewsSuffix: string
    sortNewest: string
    /** Nav title for the individual-seller (no-storefront) Profile layout — the Storefront layout has no nav title at all, see that branch's own comment. */
    profileTitle: string
    /** Contains a literal `{{year}}` marker. */
    memberSince: string
    phoneVerifiedBadge: string
    statRating: string
    statItemsSold: string
    message: string
    aboutTitle: string
    accountTypeLabel: string
    individualLabel: string
    phoneLabel: string
    verifiedLabel: string
    notVerifiedLabel: string
    previouslySoldTitle: string
    soldBadge: string
  }
  chats: {
    title: string
    searchPlaceholder: string
    /** Prepended to a preview line for the caller's own last message — contains a trailing ": " already, e.g. "You: ". */
    youPrefix: string
    emptyTitle: string
    emptySubtitle: string
  }
  gallery: {
    photoLabel: string
    videoLabel: string
  }
  postAd: {
    title: string
    editTitle: string
    step1Title: string
    step1Hint: string
    step1HintEquipment: string
    typeGemLabel: string
    typeEquipmentLabel: string
    step2Title: string
    step2Hint: string
    coverPhotoBadge: string
    addCoverPhoto: string
    addPhotoAccessibilityLabel: string
    addVideo: string
    photoTip: string
    editPhotosNotice: string
    step3Title: string
    step3TitleEquipment: string
    step3Hint: string
    titleLabel: string
    titlePlaceholder: string
    weightLabel: string
    weightPlaceholder: string
    priceLabel: string
    pricePlaceholder: string
    dimensionsLabel: string
    dimensionsPlaceholder: string
    shapeGroupLabel: string
    treatmentGroupLabel: string
    certificateGroupLabel: string
    districtGroupLabel: string
    brandLabel: string
    brandPlaceholder: string
    modelLabel: string
    modelPlaceholder: string
    conditionGroupLabel: string
    yearLabel: string
    yearPlaceholder: string
    specificationsLabel: string
    specificationsPlaceholder: string
    warrantyLabel: string
    warrantyPlaceholder: string
    descriptionLabel: string
    descriptionPlaceholder: string
    negotiableTitle: string
    negotiableHint: string
    step4Title: string
    step4Hint: string
    summaryCategory: string
    summaryWeight: string
    summaryDimensions: string
    summaryTreatment: string
    summaryCertificate: string
    summaryDistrict: string
    summaryBrand: string
    summaryModel: string
    summaryCondition: string
    summaryYear: string
    summaryPhotos: string
    edit: string
    negotiable: string
    fixedPrice: string
    reviewTip: string
    reviewAdCta: string
    publishAdCta: string
    confirmTitle: string
    confirmBody: string
    publishNow: string
    goBackAndEdit: string
    deleteDraft: string
    verifyPhoneButton: string
    confirmTitleEdit: string
    confirmBodyEdit: string
    saveChanges: string
  }
  profile: {
    navTitle: string
    editAccessibilityLabel: string
    changePhotoTitle: string
    takePhoto: string
    chooseFromLibrary: string
    removePhoto: string
    verifiedBuyer: string
    statSaved: string
    statEnquiries: string
    statPurchased: string
    groupMyGems: string
    myAds: string
    myMembership: string
    myProfile: string
    savedSearches: string
    favourites: string
    groupSettings: string
    locationLanguageCurrency: string
    accountSettings: string
    notifications: string
    groupSupport: string
    staySafe: string
    faq: string
    howToSellFast: string
    termsConditions: string
    privacyPolicy: string
    logOut: string
    logOutConfirmTitle: string
    logOutConfirmMessage: string
    logOutConfirmButton: string
    footer: string
  }
  editProfile: {
    title: string
    changePhoto: string
    fullNameLabel: string
    fullNamePlaceholder: string
    mobileNumberLabel: string
    verifiedBadge: string
    verifyPhoneLink: string
    emailLabel: string
    emailPlaceholder: string
    shopNameLabel: string
    shopNamePlaceholder: string
    districtLabel: string
    selectDistrictTitle: string
    searchDistrictPlaceholder: string
    bioLabel: string
    bioPlaceholder: string
    visibilityLabel: string
    showPhoneToggle: string
    showPhoneToggleHint: string
    publicProfileToggle: string
    publicProfileToggleHint: string
    saveChanges: string
    deleteMyAccount: string
  }
  accountSettings: {
    title: string
    sectionAppearance: string
    gemTone: string
    gemToneHint: string
    liveGradient: string
    liveGradientHint: string
    sectionLanguageRegion: string
    language: string
    country: string
    currency: string
    notifications: string
    notifEnquiriesTitle: string
    notifEnquiriesHint: string
    notifPriceDropsTitle: string
    notifPriceDropsHint: string
    notifNewListingsTitle: string
    notifNewListingsHint: string
    notifSavedDigestTitle: string
    notifSavedDigestHint: string
    notifMarketingTitle: string
    notifMarketingHint: string
    sectionSecurity: string
    changePassword: string
    twoStepVerification: string
    devicesSessions: string
    sheetSelectLanguage: string
    sheetSelectCountry: string
    sheetSelectCurrency: string
    privacy: string
    deleteAccount: string
    logOut: string
  }
  changePassword: {
    heading: string
    subtitle: string
    currentPasswordLabel: string
    currentPasswordPlaceholder: string
    newPasswordLabel: string
    confirmPasswordLabel: string
    newPasswordPlaceholder: string
    confirmPasswordPlaceholder: string
    showPassword: string
    hidePassword: string
    mismatch: string
    ruleLength: string
    ruleNumberOrSymbol: string
    ruleUppercase: string
    submit: string
  }
  deleteAccount: {
    title: string
    heading: string
    subtitle: string
    impactActiveListings: string
    impactSaved: string
    impactEnquiries: string
    impactMembership: string
    reasonLabel: string
    reasonSoldWhatIHad: string
    reasonTooManyMessages: string
    reasonFoundAnotherPlatform: string
    reasonPrivacyConcerns: string
    reasonJustTakingABreak: string
    typeToConfirmLabel: string
    typeToConfirmPlaceholder: string
    acknowledgeLabel: string
    confirmButton: string
    keepAccountButton: string
    footerHint: string
  }
  notifications: {
    title: string
    empty: string
    emptySubtitle: string
    markAllRead: string
    tabAll: string
    tabEnquiries: string
    tabPriceDrops: string
    tabNewListings: string
    justNow: string
    /** Contains a literal `{{count}}` marker. */
    minutesAgo: string
    /** Contains a literal `{{count}}` marker. */
    hoursAgo: string
    yesterday: string
    /** Contains a literal `{{count}}` marker. */
    daysAgo: string
  }
  savedSearches: {
    title: string
    blurb: string
    viewResults: string
    saveNewSearch: string
    deleteConfirmTitle: string
    deleteConfirmMessage: string
    emptyTitle: string
    emptySubtitle: string
  }
  favourites: {
    emptyTitle: string
    emptySubtitle: string
  }
  stores: {
    title: string
    searchPlaceholder: string
    emptyTitle: string
    emptySubtitle: string
  }
  searchResults: {
    /** Fallback nav title when no `q` was searched (e.g. "View all" with no active filters). */
    title: string
    /** Contains a literal `{{count}}` marker, interpolated at the call site with the real `GET /search` `found` total. */
    resultsCount: string
    emptyTitle: string
    emptySubtitle: string
  }
  myAds: {
    title: string
    statTotalAds: string
    statViews: string
    statSaves: string
    tabAll: string
    statusActive: string
    statusPending: string
    statusSold: string
    statusExpired: string
    statusDraft: string
    statusPaused: string
    edit: string
    markSold: string
    relist: string
    view: string
    renew: string
    deactivate: string
    reactivate: string
    delete: string
    deleteConfirmTitle: string
    deleteConfirmMessage: string
    submitForReview: string
    remove: string
    removeConfirmTitle: string
    removeConfirmMessage: string
    emptyTitle: string
    emptySubtitle: string
    postNewAd: string
  }
  membership: {
    title: string
    currentPlanBadge: string
    /** Contains literal `{{date}}`/`{{price}}` markers — the renewal date and formatted monthly price are interpolated at the call site. */
    renewsLine: string
    activeListingsLabel: string
    /** Contains literal `{{used}}`/`{{total}}` markers. */
    listingsUsed: string
    /** Contains a literal `{{used}}` marker — shown instead of `listingsUsed` for Trader Pro's unlimited quota, which has no total to show a fraction against. */
    listingsUnlimited: string
    invoices: string
    benefitsLabel: string
    upgradeLabel: string
    perMonth: string
    currentBadge: string
    bestValueBadge: string
    paymentMethodLabel: string
    change: string
    /** Contains a literal `{{date}}` marker. */
    expiresLabel: string
    /** The per-tier action button's label for a plan above the current one. */
    upgradeAction: string
    /** Contains a literal `{{name}}` marker — screen-reader label for the "Upgrade" button on a specific tier. */
    upgradeTo: string
    /** Contains a literal `{{name}}` marker — screen-reader label for the "Change" button on a specific tier. */
    changeTo: string
    cancelMembership: string
    plans: {
      basic: { name: string; detail: string; benefits: string[] }
      plus: { name: string; detail: string; benefits: string[] }
      pro: { name: string; detail: string; benefits: string[] }
    }
  }
  paymentMethod: {
    title: string
    cardholderLabel: string
    expiresLabel: string
    yourNamePlaceholder: string
    expiryPlaceholder: string
    savedCardsLabel: string
    /** Contains a literal `{{date}}` marker — a saved card's own expiry is interpolated at the call site. */
    cardExpiresRow: string
    addNewCard: string
    defaultBadge: string
    cardDetailsLabel: string
    cardNumberLabel: string
    nameOnCardLabel: string
    expiryFieldLabel: string
    cvvLabel: string
    cardNumberPlaceholder: string
    namePlaceholder: string
    makeDefaultLabel: string
    /** Contains a literal `{{date}}` marker — the membership renewal date is interpolated at the call site. */
    disclaimer: string
    ctaSaved: string
    ctaSaveCard: string
    ctaKeepDefault: string
    /** Contains a literal `{{label}}` marker — the saved card's own demo label (e.g. "Visa ending 4412") is interpolated at the call site, not translated itself. */
    ctaUseCard: string
    removeCard: string
  }
  noAccount: {
    navTitle: string
    heading: string
    /** Contains a literal `{{identifier}}` marker — the phone number or email the user typed on Sign In is interpolated (and bolded) at the call site. */
    subhead: string
    perkBidding: string
    perkValuations: string
    perkEscrow: string
    signUpButton: string
    tryDifferent: string
    helpPrompt: string
    contactLink: string
  }
  countryPicker: {
    title: string
    searchPlaceholder: string
  }
  localeSettings: {
    title: string
    language: string
    currency: string
    location: string
  }
}

export const en: Dictionary = {
  common: {
    continue: 'Continue',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    notNow: 'Not now',
    search: 'Search',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    retry: 'Retry',
    loading: 'Loading…',
    genericError: 'Something went wrong. Please try again.',
    optional: 'Optional',
    reset: 'Reset',
    send: 'Send',
    close: 'Close',
  },
  auth: {
    signIn: {
      title: 'Welcome back',
      subtitle: 'Sign in to bid on live lots, track valuations and settle in your own currency.',
      mobileMode: 'Mobile number',
      emailMode: 'Email',
      mobileFieldLabel: 'Mobile number',
      emailFieldLabel: 'Email address',
      emailLabel: 'Email',
      emailPlaceholder: 'you@gemhouse.lk',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      rememberMe: 'Keep me signed in',
      forgotPassword: 'Forgot Password',
      orContinueWith: 'or continue with',
      submit: 'Sign In',
      noAccount: "Don't have an account?",
      signUpLink: 'Sign up',
    },
    signUp: {
      title: 'Create your account',
      subtitle: 'Join Sri Lanka’s trusted gem marketplace',
      nameLabel: 'Full name',
      namePlaceholder: 'Nimal Perera',
      mobileLabel: 'Mobile number',
      emailLabel: 'Email address',
      emailPlaceholder: 'you@gemhouse.lk',
      passwordLabel: 'Password',
      passwordPlaceholder: '8+ characters',
      submit: 'Create account',
      hasAccount: 'Already have an account?',
      signInLink: 'Sign in',
      termsNotice: 'By continuing, you agree to our Terms and Privacy Policy.',
      termsAgreement: 'I agree to the {{tradingTerms}} and NGJA certification checks.',
      tradingTerms: 'Trading Terms',
    },
    forgotPassword: {
      navTitle: 'Forgot Password',
      title: 'Reset your password',
      subtitle: 'Choose where we should send your reset code. It stays valid for 10 minutes.',
      channelMobileTitle: 'Text message',
      channelMobileHint: 'Code sent by SMS to your mobile',
      channelEmailTitle: 'Email',
      channelEmailHint: 'Code sent to your registered email',
      mobileLabel: 'Mobile number',
      emailLabel: 'Email address',
      emailPlaceholder: 'you@gemhouse.lk',
      submit: 'Send reset code',
      safetyNote: 'For your safety, active bids are paused until you finish resetting.',
      rememberedIt: 'Remembered it?',
      signIn: 'Sign In',
    },
    resetPassword: {
      title: 'Set a new password',
      subtitle: 'Choose a new password for your account',
      codeLabel: 'Reset code',
      codePlaceholder: 'Enter the code you received',
      newPasswordLabel: 'New password',
      confirmPasswordLabel: 'Confirm password',
      submit: 'Reset password',
      success: 'Your password has been reset',
    },
    verifyPhone: {
      navTitle: 'Verification',
      title: 'Verification code',
      subtitle: 'Enter the 6-digit code we sent to',
      resendPrompt: "Didn't receive the code?",
      resendCode: 'Resend',
      resendIn: 'Resend in',
      statusExpires: 'Code expires in 5:00',
      statusReadyToConfirm: 'Tap confirm to continue',
      statusVerified: 'Code verified',
      submit: 'Confirm',
      verified: 'Verified',
      noPhoneTitle: 'No phone number on file',
      noPhoneSubtitle: 'Add a mobile number to your profile first, then come back to verify it.',
      addPhoneButton: 'Add a phone number',
    },
    verifyEmail: {
      navTitle: 'Verify Email',
      title: 'Check your email',
      subtitle: 'Enter the 6-digit code we sent to',
      resendPrompt: "Didn't receive the code?",
      resendCode: 'Resend',
      resendIn: 'Resend in',
      statusExpires: 'Code expires in 5:00',
      statusReadyToConfirm: 'Tap confirm to continue',
      statusVerified: 'Code verified',
      submit: 'Confirm',
      verified: 'Verified',
      wrongAddress: 'Wrong address?',
      changeEmail: 'Change email',
    },
  },
  home: {
    searchPlaceholder: 'Search sapphire, spinel, moonstone',
    featuredTitle: 'Featured lots',
    categoriesTitle: 'Categories',
    gemsTab: 'Gems',
    equipmentTab: 'Equipment',
    viewAll: 'View all',
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    filtersTitle: 'Filters',
    maxPriceLabel: 'Max price',
    showResultsCount: 'Show {{count}} results',
  },
  listingDetail: {
    priceOnRequest: 'Price on request',
    contactSeller: 'Contact seller',
    whatsapp: 'WhatsApp',
    call: 'Call',
    chat: 'Chat',
    callSeller: 'Call seller',
    callNotSupported: "This device can't place calls — try it on a phone instead.",
    revealPhone: 'Reveal phone number',
    reportListing: 'Report this listing',
    blockSeller: 'Block seller',
    similarListings: 'Similar listings',
    viewAll: 'View all',
    priceLabel: 'Price',
    aboutTab: 'About',
    specsTab: 'Specs',
    sellerTab: 'Seller',
    recentlyViewed: 'Recently viewed',
    certificate: 'Certificate',
    treatment: 'Treatment',
    origin: 'Origin',
    weight: 'Weight',
    dimensions: 'Dimensions',
    shape: 'Shape',
    color: 'Color',
    clarity: 'Clarity',
    soldBadge: 'Sold',
  },
  chat: {
    presenceOnline: 'Online · replies in ~5 min',
    presenceTyping: 'typing…',
    today: 'Today',
    safetyNotice:
      'Keep payments on the exchange. Escrow protects both sides until the stone is verified.',
    yourOffer: 'Your offer',
    listedAt: 'Listed at {{price}} · held in escrow on accept',
    offerAccepted: 'Accepted by seller',
    offerPending: 'Awaiting seller response',
    composerPlaceholder: 'Message {{name}}',
    autoReply: 'Thanks — let me check with the owner and get back to you shortly.',
    quickBookViewing: 'Book a viewing',
    quickRequestVideo: 'Request video',
    quickNegotiable: 'Is the price negotiable?',
    seen: 'Seen',
    moreOptions: 'More options',
    reportTitle: 'Why are you reporting this listing?',
    reportReasonCounterfeit: 'Counterfeit or fake',
    reportReasonMisleading: 'Misleading description or photos',
    reportReasonProhibitedItem: 'Prohibited item',
    reportReasonScam: 'Looks like a scam',
    reportReasonOther: 'Something else',
    reportDetailsPlaceholder: 'Add any extra details (optional)',
    reportSubmit: 'Submit report',
    reportSuccessTitle: 'Report submitted',
    reportSuccessMessage:
      "Thanks — our team will review this listing. It's still visible while we look into it.",
    unblockSeller: 'Unblock seller',
    blockConfirmTitle: 'Block this seller?',
    blockConfirmMessage:
      "You won't see their listings in search, and you won't be able to message them or reveal their phone number.",
    blockConfirmButton: 'Block seller',
    unblockConfirmTitle: 'Unblock this seller?',
    unblockConfirmMessage: "You'll see their listings again and be able to contact them.",
    unblockConfirmButton: 'Unblock seller',
  },
  sellerProfile: {
    title: 'Seller',
    shareLabel: 'Share this store',
    coverPhotoLabel: 'Shop cover photo',
    galleryTitle: 'Shop gallery',
    chatWithSeller: 'Chat with seller',
    chat: 'Chat',
    directions: 'Directions',
    noListings: 'No active listings right now.',
    searchInPrefix: 'Search in',
    allChipLabel: 'All',
    stonesSuffix: 'stones',
    reviewsSuffix: 'reviews',
    sortNewest: 'Newest',
    profileTitle: 'Profile',
    memberSince: 'Member since {{year}}',
    phoneVerifiedBadge: 'Phone verified',
    statRating: 'RATING',
    statItemsSold: 'ITEMS SOLD',
    message: 'Message',
    aboutTitle: 'About',
    accountTypeLabel: 'Account type',
    individualLabel: 'Individual',
    phoneLabel: 'Phone',
    verifiedLabel: 'Verified',
    notVerifiedLabel: 'Not verified',
    previouslySoldTitle: 'Previously sold',
    soldBadge: 'Sold',
  },
  chats: {
    title: 'Chats',
    searchPlaceholder: 'Search chats',
    youPrefix: 'You: ',
    emptyTitle: 'No conversations yet',
    emptySubtitle: "Message a seller from any listing and it'll show up here.",
  },
  gallery: {
    photoLabel: 'Photo',
    videoLabel: 'Video',
  },
  postAd: {
    title: 'Post an ad',
    editTitle: 'Edit ad',
    step1Title: 'Choose a category',
    step1Hint: 'What kind of stone are you listing?',
    step1HintEquipment: 'What equipment are you listing?',
    typeGemLabel: 'Gem',
    typeEquipmentLabel: 'Equipment',
    step2Title: 'Add photos & video',
    step2Hint: 'A clear cover photo doubles your enquiries.',
    coverPhotoBadge: 'Cover photo',
    addCoverPhoto: 'Tap to add your cover photo',
    addPhotoAccessibilityLabel: 'Add photo',
    addVideo: 'Add video',
    photoTip:
      'Daylight, plain background, and one loupe shot sell fastest. Up to 20 photos and one video.',
    editPhotosNotice:
      "Photos can't be changed from this screen yet — everything else below is editable.",
    step3Title: 'Gem details',
    step3TitleEquipment: 'Equipment details',
    step3Hint: 'Buyers filter on these — be precise.',
    titleLabel: 'Ad title',
    titlePlaceholder: 'e.g. Ceylon Blue Sapphire',
    weightLabel: 'Weight',
    weightPlaceholder: '3.14',
    priceLabel: 'Asking price',
    pricePlaceholder: '8,400',
    dimensionsLabel: 'Dimensions',
    dimensionsPlaceholder: 'e.g. 9.2 × 7.4 × 5.1 mm',
    shapeGroupLabel: 'Shape / cut',
    treatmentGroupLabel: 'Treatment',
    certificateGroupLabel: 'Certificate',
    districtGroupLabel: 'District',
    brandLabel: 'Brand',
    brandPlaceholder: 'e.g. Facetron',
    modelLabel: 'Model',
    modelPlaceholder: 'e.g. Standard Faceter',
    conditionGroupLabel: 'Condition',
    yearLabel: 'Year manufactured',
    yearPlaceholder: '2020',
    specificationsLabel: 'Specifications',
    specificationsPlaceholder: 'Motor, index wheel, included accessories…',
    warrantyLabel: 'Warranty info',
    warrantyPlaceholder: 'e.g. 6 months seller warranty',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Colour, clarity, origin, certificate details…',
    negotiableTitle: 'Price negotiable',
    negotiableHint: 'Buyers can send you offers',
    step4Title: 'Review & publish',
    step4Hint: 'Check everything before it goes live.',
    summaryCategory: 'Category',
    summaryWeight: 'Weight',
    summaryDimensions: 'Dimensions',
    summaryTreatment: 'Treatment',
    summaryCertificate: 'Certificate',
    summaryDistrict: 'District',
    summaryBrand: 'Brand',
    summaryModel: 'Model',
    summaryCondition: 'Condition',
    summaryYear: 'Year',
    summaryPhotos: 'Photos',
    edit: 'Edit',
    negotiable: 'Negotiable',
    fixedPrice: 'Fixed price',
    reviewTip: 'Our team reviews certificates before your ad goes live. Usually under 2 hours.',
    reviewAdCta: 'Review ad',
    publishAdCta: 'Publish ad',
    confirmTitle: 'Ready to publish?',
    confirmBody:
      "Once your ad is live, its details are locked for buyer trust — weight, treatment, certificate and price can't be edited afterwards. Please take one last look before you publish.",
    publishNow: 'Publish now',
    goBackAndEdit: 'Go back and edit',
    deleteDraft: 'Delete this draft',
    verifyPhoneButton: 'Verify phone number',
    confirmTitleEdit: 'Save these changes?',
    confirmBodyEdit: "Your ad's text, price and details will update right away.",
    saveChanges: 'Save changes',
  },
  profile: {
    navTitle: 'My account',
    editAccessibilityLabel: 'Edit profile',
    changePhotoTitle: 'Change photo',
    takePhoto: 'Take photo',
    chooseFromLibrary: 'Choose from library',
    removePhoto: 'Remove photo',
    verifiedBuyer: 'Verified buyer',
    statSaved: 'Saved',
    statEnquiries: 'Enquiries',
    statPurchased: 'Purchased',
    groupMyGems: 'My gems',
    myAds: 'My ads',
    myMembership: 'My membership',
    myProfile: 'My profile',
    savedSearches: 'Saved searches',
    favourites: 'Favourites',
    groupSettings: 'Settings',
    locationLanguageCurrency: 'Location, language & currency',
    accountSettings: 'Account settings',
    notifications: 'Notifications',
    groupSupport: 'Support',
    staySafe: 'Stay safe',
    faq: 'FAQ',
    howToSellFast: 'How to sell fast',
    termsConditions: 'Terms and conditions',
    privacyPolicy: 'Privacy policy',
    logOut: 'Log out',
    logOutConfirmTitle: 'Log out?',
    logOutConfirmMessage: "You'll need to sign in again to buy, sell, or message on the exchange.",
    logOutConfirmButton: 'Log out',
    footer: 'Ceylon Gem Exchange · v2.4.1',
  },
  editProfile: {
    title: 'Edit Profile',
    changePhoto: 'Change photo',
    fullNameLabel: 'Full name',
    fullNamePlaceholder: 'Your name',
    mobileNumberLabel: 'Mobile number',
    verifiedBadge: 'Verified',
    verifyPhoneLink: 'Verify now',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@gemhouse.lk',
    shopNameLabel: 'Display name / Shop',
    shopNamePlaceholder: 'Optional',
    districtLabel: 'District',
    selectDistrictTitle: 'Select district',
    searchDistrictPlaceholder: 'Search district',
    bioLabel: 'About you',
    bioPlaceholder: 'Tell sellers what you collect',
    visibilityLabel: 'Visibility',
    showPhoneToggle: 'Show my phone number',
    showPhoneToggleHint: 'Sellers can call you directly',
    publicProfileToggle: 'Public collector profile',
    publicProfileToggleHint: 'Others can see your favourites',
    saveChanges: 'Save changes',
    deleteMyAccount: 'Delete my account',
  },
  accountSettings: {
    title: 'Account settings',
    sectionAppearance: 'Appearance',
    gemTone: 'Gem tone',
    gemToneHint: 'Accent colour across the app',
    liveGradient: 'Live gradient',
    liveGradientHint: 'Animate the background on every screen',
    sectionLanguageRegion: 'Language & region',
    language: 'Language',
    country: 'Country',
    currency: 'Currency',
    notifications: 'Notifications',
    notifEnquiriesTitle: 'Buyer enquiries',
    notifEnquiriesHint: 'New messages about your ads',
    notifPriceDropsTitle: 'Price drops',
    notifPriceDropsHint: 'Saved gems that get cheaper',
    notifNewListingsTitle: 'New listings',
    notifNewListingsHint: 'Matches for your saved searches',
    notifSavedDigestTitle: 'Saved search digest',
    notifSavedDigestHint: 'One summary email each week',
    notifMarketingTitle: 'Offers & tips',
    notifMarketingHint: 'Selling tips and promotions',
    sectionSecurity: 'Security',
    changePassword: 'Change password',
    twoStepVerification: 'Two-step verification',
    devicesSessions: 'Devices & sessions',
    sheetSelectLanguage: 'Select language',
    sheetSelectCountry: 'Select country',
    sheetSelectCurrency: 'Select currency',
    privacy: 'Privacy',
    deleteAccount: 'Delete account',
    logOut: 'Log out',
  },
  changePassword: {
    heading: 'Set a new password',
    subtitle: "Choose a password you haven't used before. You'll be signed out on other devices.",
    currentPasswordLabel: 'CURRENT PASSWORD',
    currentPasswordPlaceholder: 'Enter current password',
    newPasswordLabel: 'NEW PASSWORD',
    confirmPasswordLabel: 'CONFIRM PASSWORD',
    newPasswordPlaceholder: '8+ characters',
    confirmPasswordPlaceholder: 'Re-enter password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    mismatch: "Passwords don't match",
    ruleLength: 'At least 8 characters',
    ruleNumberOrSymbol: 'One number or symbol',
    ruleUppercase: 'One uppercase letter',
    submit: 'Update password',
  },
  deleteAccount: {
    title: 'Delete account',
    heading: "This can't be undone",
    subtitle: 'Deleting {{phone}} removes your account and everything in it, permanently.',
    impactActiveListings: '{{count}} active ads and all their photos',
    impactSaved: '{{gems}} saved gems and {{searches}} saved searches',
    impactEnquiries: 'Your enquiry history with sellers',
    impactMembership: 'Trader Plus membership — no refund for the unused period',
    reasonLabel: 'Why are you leaving? (optional)',
    reasonSoldWhatIHad: 'Sold what I had',
    reasonTooManyMessages: 'Too many messages',
    reasonFoundAnotherPlatform: 'Found another platform',
    reasonPrivacyConcerns: 'Privacy concerns',
    reasonJustTakingABreak: 'Just taking a break',
    typeToConfirmLabel: 'Type DELETE to confirm',
    typeToConfirmPlaceholder: 'DELETE',
    acknowledgeLabel: 'I understand my listings, enquiries and membership will be lost forever.',
    confirmButton: 'Delete my account',
    keepAccountButton: 'Keep my account',
    footerHint:
      'Need a break instead? You can hide your ads and pause notifications from Account settings.',
  },
  notifications: {
    title: 'Notifications',
    empty: "You're all caught up",
    emptySubtitle: 'Nothing new in this filter right now.',
    markAllRead: 'Mark all as read',
    tabAll: 'All',
    tabEnquiries: 'Enquiries',
    tabPriceDrops: 'Price drops',
    tabNewListings: 'New listings',
    justNow: 'Just now',
    minutesAgo: '{{count}} min ago',
    hoursAgo: '{{count}} hours ago',
    yesterday: 'Yesterday',
    daysAgo: '{{count}} days ago',
  },
  savedSearches: {
    title: 'Saved searches',
    blurb: "Turn on alerts and we'll notify you the moment a matching gem is listed.",
    viewResults: 'View results',
    saveNewSearch: 'Save a new search',
    deleteConfirmTitle: 'Delete this saved search?',
    deleteConfirmMessage: "You'll stop getting alerts for new matches.",
    emptyTitle: 'No saved searches yet',
    emptySubtitle: 'Searches you save will appear here with alerts for new matches.',
  },
  favourites: {
    emptyTitle: 'No favourites yet',
    emptySubtitle: 'Tap the heart on a listing to save it here.',
  },
  stores: {
    title: 'Stores',
    searchPlaceholder: 'Search stores',
    emptyTitle: 'No stores found',
    emptySubtitle: 'Try a different search.',
  },
  searchResults: {
    title: 'Search results',
    resultsCount: '{{count}} found',
    emptyTitle: 'No matches yet',
    emptySubtitle: "We'll show new listings here as they match this search.",
  },
  myAds: {
    title: 'My ads',
    statTotalAds: 'Total ads',
    statViews: 'Views',
    statSaves: 'Saves',
    tabAll: 'All',
    statusActive: 'Active',
    statusPending: 'Pending',
    statusSold: 'Sold',
    statusExpired: 'Expired',
    statusDraft: 'Draft',
    statusPaused: 'Paused',
    edit: 'Edit',
    markSold: 'Mark sold',
    relist: 'Relist',
    view: 'View',
    renew: 'Renew',
    deactivate: 'Deactivate',
    reactivate: 'Reactivate',
    delete: 'Delete',
    deleteConfirmTitle: 'Delete this ad?',
    deleteConfirmMessage: 'This will permanently remove the listing from your account.',
    submitForReview: 'Submit for review',
    remove: 'Remove',
    removeConfirmTitle: 'Remove this ad?',
    removeConfirmMessage: "It'll be taken down from the marketplace. You can't undo this.",
    emptyTitle: 'Nothing here yet',
    emptySubtitle: 'Ads you post in this state will appear here.',
    postNewAd: 'Post a new ad',
  },
  membership: {
    title: 'My membership',
    currentPlanBadge: 'CURRENT PLAN',
    renewsLine: 'Renews {{date}} · {{price}} / month',
    activeListingsLabel: 'ACTIVE LISTINGS',
    listingsUsed: '{{used}} of {{total}} used',
    listingsUnlimited: '{{used}} active · unlimited',
    invoices: 'Invoices',
    benefitsLabel: 'YOUR CURRENT BENEFITS',
    upgradeLabel: 'UPGRADE',
    perMonth: '/ month',
    currentBadge: 'Current',
    bestValueBadge: 'Best value',
    paymentMethodLabel: 'PAYMENT METHOD',
    change: 'Change',
    expiresLabel: 'Expires {{date}}',
    upgradeAction: 'Upgrade',
    upgradeTo: 'Upgrade to {{name}}',
    changeTo: 'Change to {{name}}',
    cancelMembership: 'Cancel membership',
    plans: {
      basic: {
        name: 'Trader Basic',
        detail: '5 active listings · standard placement',
        benefits: [
          '5 active listings at any time',
          'Standard placement in district search',
          'Up to 4 photos per ad',
          'Email support',
        ],
      },
      plus: {
        name: 'Trader Plus',
        detail: '20 active listings · priority in search',
        benefits: [
          '20 active listings at any time',
          'Priority placement in district search',
          'Verified seller badge on every ad',
          'Buyer enquiry analytics',
        ],
      },
      pro: {
        name: 'Trader Pro',
        detail: 'Unlimited listings · featured slots weekly',
        benefits: [
          'Unlimited active listings',
          'Two featured home slots every week',
          'Video on every listing · 20 photos',
          'Dedicated account manager & WhatsApp desk',
        ],
      },
    },
  },
  paymentMethod: {
    title: 'Payment method',
    cardholderLabel: 'CARDHOLDER',
    expiresLabel: 'EXPIRES',
    yourNamePlaceholder: 'YOUR NAME',
    expiryPlaceholder: 'MM / YY',
    savedCardsLabel: 'SAVED CARDS',
    cardExpiresRow: 'Expires {{date}}',
    addNewCard: 'Add a new card',
    defaultBadge: 'Default',
    cardDetailsLabel: 'CARD DETAILS',
    cardNumberLabel: 'CARD NUMBER',
    nameOnCardLabel: 'NAME ON CARD',
    expiryFieldLabel: 'EXPIRY',
    cvvLabel: 'CVV',
    cardNumberPlaceholder: '1234 5678 9012 3456',
    namePlaceholder: 'Nimal Perera',
    makeDefaultLabel: 'Use as default for membership renewals',
    disclaimer:
      'Card details are encrypted and stored by our payment processor. Trader Plus renews on {{date}}.',
    ctaSaved: 'Saved',
    ctaSaveCard: 'Save card',
    ctaKeepDefault: 'Keep as default',
    ctaUseCard: 'Use {{label}}',
    removeCard: 'Remove this card',
  },
  noAccount: {
    navTitle: 'Sign In',
    heading: "You don't have\nan account",
    subhead:
      "We couldn't find a trader profile for {{identifier}}. Create account to start buying certified gems.",
    perkBidding: 'Bid on live certified lots',
    perkValuations: 'Track valuations in your currency',
    perkEscrow: 'Settle with escrow protection',
    signUpButton: 'Please Sign Up',
    tryDifferent: 'Try different number or email',
    helpPrompt: 'Need help?',
    contactLink: 'Contact the exchange',
  },
  countryPicker: {
    title: 'Select country',
    searchPlaceholder: 'Search country or code',
  },
  localeSettings: {
    title: 'Location, language & currency',
    language: 'Language',
    currency: 'Currency',
    location: 'Location',
  },
}
