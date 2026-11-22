export interface UstpCollegeOption {
  code: string;
  label: string;
  value: string;
  courses: readonly string[];
}

export const USTP_COLLEGES: readonly UstpCollegeOption[] = [
  {
    code: 'CITC',
    label: 'CITC — College of Information Technology and Computing',
    value: 'College of Information Technology and Computing (CITC)',
    courses: [
      'BS in Information Technology',
      'BS in Computer Science',
      'BS in Data Science',
      'BS in Technology Communication Management',
    ],
  },
  {
    code: 'CEA',
    label: 'CEA — College of Engineering and Architecture',
    value: 'College of Engineering and Architecture (CEA)',
    courses: [
      'BS in Architecture',
      'BS in Civil Engineering',
      'BS in Computer Engineering',
      'BS in Electrical Engineering',
      'BS in Electronics Engineering',
      'BS in Geodetic Engineering',
      'BS in Mechanical Engineering',
    ],
  },
  {
    code: 'CSM',
    label: 'CSM — College of Science and Mathematics',
    value: 'College of Science and Mathematics (CSM)',
    courses: [
      'BS in Applied Mathematics',
      'BS in Applied Physics',
      'BS in Chemistry',
      'BS in Environmental Science',
      'BS in Food Technology',
    ],
  },
  {
    code: 'COT',
    label: 'COT — College of Technology',
    value: 'College of Technology (COT)',
    courses: [
      'BS in Autotronics',
      'BS in Electro-Mechanical Technology',
      'BS in Electronics Technology',
      'BS in Energy Systems and Management',
      'BS in Manufacturing Engineering Technology',
    ],
  },
  {
    code: 'CSTE',
    label: 'CSTE — College of Science and Technology Education',
    value: 'College of Science and Technology Education (CSTE)',
    courses: [
      'Bachelor in Secondary Education Major in Mathematics',
      'Bachelor in Secondary Education Major in Science',
      'Bachelor in Technical-Vocational Teacher Education',
      'Bachelor in Technology and Livelihood Education',
      'Bachelor of Technology, Operations, and Management',
    ],
  },
  {
    code: 'COM',
    label: 'COM — College of Medicine',
    value: 'College of Medicine (COM)',
    courses: ['Doctor of Medicine'],
  },
] as const;

export const ALLOWED_USTP_COLLEGE_VALUES = new Set(USTP_COLLEGES.map((c) => c.value));

export function getCoursesForCollege(collegeValue: string): readonly string[] {
  const clean = collegeValue.trim();
  const matched = USTP_COLLEGES.find(
    (c) => c.value === clean || c.code.toUpperCase() === clean.toUpperCase()
  );
  return matched ? matched.courses : [];
}

export function isCourseValidForCollege(collegeValue: string, courseValue: string): boolean {
  const cleanCollege = collegeValue.trim();
  const cleanCourse = courseValue.trim();
  if (!cleanCollege || !cleanCourse) return false;
  const courses = getCoursesForCollege(cleanCollege);
  return courses.includes(cleanCourse);
}

