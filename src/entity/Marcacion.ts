import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Usuario} from "./Usuario";

@Entity()
export class Marcacion {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    ci: number
    @Column({type: 'datetime', nullable: true})
    fechaMarcaje: Date;
    @ManyToOne(() => Usuario, (usuario) => usuario.marcaciones)
    usuario: Usuario
}