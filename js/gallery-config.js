/**
 * Photography Gallery Configuration
 * 
 * To add or remove photos:
 * 1. Upload your photo to Cloudinary or any other image host.
 * 2. Paste the full direct link of the photo inside the `photos` array below.
 * 3. To remove a photo, simply delete its URL line from the array.
 */
window.GALLERY_CONFIG = {
  // Direct links to your photos.
  // Paste full URLs directly. The site will automatically handle resizing
  // and optimizations if they are Cloudinary links!
  photos: [
    "https://images.pexels.com/photos/35713440/pexels-photo-35713440.jpeg?_gl=1*14kkrzl*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMzOTAkajEyJGwwJGgw",
    "https://images.pexels.com/photos/34245072/pexels-photo-34245072.jpeg?_gl=1*26mcqf*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMzMzAkajYkbDAkaDA.",
    "https://images.pexels.com/photos/33982292/pexels-photo-33982292.jpeg?_gl=1*1w8gszq*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMyMjIkajQ5JGwwJGgw",
    "https://images.pexels.com/photos/34245073/pexels-photo-34245073.jpeg?_gl=1*1gs66y5*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMzNDIkajYwJGwwJGgw",
    "https://images.pexels.com/photos/33982306/pexels-photo-33982306.jpeg?_gl=1*1m19eed*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMzMTUkajIxJGwwJGgw",
    "https://images.pexels.com/photos/33982297/pexels-photo-33982297.jpeg?_gl=1*7tj8vg*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMyNzYkajYwJGwwJGgw",
    "https://images.pexels.com/photos/33580951/pexels-photo-33580951.jpeg?_gl=1*1yw9s3h*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMxMTQkajMkbDAkaDA.",
    "https://images.pexels.com/photos/37734323/pexels-photo-37734323.jpeg?_gl=1*hv0c1*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk2NDUzMzAkbzEwJGcxJHQxNzc5NjQ1MzU5JGozMSRsMCRoMA..",
    "https://images.pexels.com/photos/37734325/pexels-photo-37734325.jpeg?_gl=1*1wladur*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk2NDUzMzAkbzEwJGcxJHQxNzc5NjQ1MzM1JGo1NSRsMCRoMA..",
    "https://images.pexels.com/photos/36685709/pexels-photo-36685709.jpeg?_gl=1*1oq6xt9*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMzOTckajUkbDAkaDA.",
    "https://images.pexels.com/photos/37734324/pexels-photo-37734324.jpeg?_gl=1*7cy5bl*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk2NDUzMzAkbzEwJGcxJHQxNzc5NjQ1MzUyJGozOCRsMCRoMA..",
    "https://images.pexels.com/photos/33982288/pexels-photo-33982288.jpeg?_gl=1*1blxi7r*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMyMTEkajYwJGwwJGgw",
    "https://images.pexels.com/photos/33982291/pexels-photo-33982291.jpeg?_gl=1*11rdp90*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMyMTckajU0JGwwJGgw",
    "https://images.pexels.com/photos/33982300/pexels-photo-33982300.jpeg?_gl=1*2pgf5v*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMyODckajQ5JGwwJGgw",
    "https://images.pexels.com/photos/34245070/pexels-photo-34245070.jpeg?_gl=1*1ibrmtt*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMzMjIkajE0JGwwJGgw",
    "https://images.pexels.com/photos/34886284/pexels-photo-34886284.jpeg?_gl=1*5vdpjk*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMzNTEkajUxJGwwJGgw",
    "https://images.pexels.com/photos/35146706/pexels-photo-35146706.jpeg?_gl=1*eczqxi*_ga*MTQzMDU5NDA4Ny4xNzc0MTk2Nzg3*_ga_8JE65Q40S6*czE3Nzk1MzMwNTckbzUkZzEkdDE3Nzk1MzMzNjAkajQyJGwwJGgw",

  ]
};