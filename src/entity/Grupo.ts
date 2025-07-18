import {BaseEntity, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Usuario} from "./Usuario";
import {Terminal} from "./Terminal";

@Entity()
export class Grupo extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    nombre: string
    @OneToMany(() => Usuario, (usuario) => usuario.grupo)
    usuarios: Usuario[]
    @ManyToOne(() => Terminal, (terminal) => terminal.grupos)
    terminal: Terminal
}
