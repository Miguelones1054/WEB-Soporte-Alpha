const RANDOM_NAMES = [
  'Santiago', 'Valentina', 'Mateo', 'Isabella', 'Sebastian', 'Camila', 'Miguel', 'Sofía',
  'Alejandro', 'Mariana', 'Daniel', 'Gabriela', 'Andres', 'Natalia', 'Felipe', 'Daniela',
  'Juan', 'Laura', 'David', 'Paula', 'Carlos', 'Juliana', 'Luis', 'Andrea', 'Jorge',
  'Catalina', 'Ricardo', 'Paola', 'Rodrigo', 'Valeria', 'Fernando', 'Monica', 'Sergio',
  'Carolina', 'Eduardo', 'Alejandra', 'Alberto', 'Melissa', 'Oscar', 'Diana', 'Javier',
  'Tatiana', 'Nicolas', 'Stefania', 'Mauricio', 'Lorena', 'Gustavo', 'Angela', 'Cristian',
  'Viviana', 'Hector', 'Marcela', 'Mario', 'Claudia', 'Raul', 'Patricia', 'Hernan',
  'Sandra', 'Victor', 'Elena', 'Ernesto', 'Silvia', 'Pablo', 'Adriana', 'Gonzalo',
  'Luisa', 'Esteban', 'Yessica', 'Fabian', 'Xiomara', 'Jonathan', 'Liliana', 'Wilmer',
  'Nathalia', 'Brayan', 'Estefania', 'Kevin', 'Dayana', 'Jefferson', 'Leidy', 'Jhon',
  'Milena', 'Edson', 'Karina', 'Duvan', 'Wendy', 'Elias', 'Vanessa', 'Cesar', 'Gloria',
  'Ruben', 'Ingrid', 'Jhonatan', 'Lina', 'Ivan', 'Angie', 'Yamid', 'Karen', 'Harold',
  'Manuela', 'Herber', 'Yeimi', 'Cristobal', 'Shirley', 'Bladimir', 'Johana', 'Alexis',
  'Berenice', 'Fredy', 'Esperanza', 'Oswaldo', 'Rocio', 'Armando', 'Nubia', 'Jairo',
  'Olga', 'Elkin', 'Blanca', 'Ferney', 'Amparo', 'Giovanny', 'Marta', 'Camilo', 'Rosa',
  'Abel', 'Zulma', 'Nelson', 'Ximena', 'Wilson', 'Luz', 'Yhon', 'Yuri', 'Jhony', 'Sonia',
  'Tobias', 'Rebeca', 'Isidro', 'Constanza', 'Leonel', 'Marisol', 'Ramiro', 'Susana',
] as const;

function randomPin4(): string {
  return String(Math.floor(Math.random() * 9000) + 1000);
}

export function generateRandomNequiCredentials(): { phone: string; pin: string } {
  const minPhone = 3_000_000_000;
  const maxPhone = 3_239_999_999;
  const phone = String(Math.floor(Math.random() * (maxPhone - minPhone + 1)) + minPhone);
  return { phone, pin: randomPin4() };
}

export function generateRandomBancolombiaCredentials(): { usuario: string; pin: string } {
  const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const randomSuffix = Math.floor(Math.random() * 900) + 100;
  return { usuario: `${randomName}${randomSuffix}`, pin: randomPin4() };
}
